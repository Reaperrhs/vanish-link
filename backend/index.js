const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { Client, Databases, Query, ID } = require('node-appwrite');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '.env') });

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

// Only honor X-Forwarded-* headers when sitting behind a known reverse proxy.
// Opt-in via env: the backend is also reachable directly, where trusting the
// header would let clients spoof their IP to dodge the rate limiter.
if (process.env.TRUST_PROXY) {
    const hops = parseInt(process.env.TRUST_PROXY, 10);
    app.set('trust proxy', Number.isNaN(hops) ? 1 : hops);
}

app.use(cors());
app.use(express.json());

// Appwrite Configuration
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.DATABASE_ID;
const COLLECTION_ID = process.env.COLLECTION_ID;
const ANALYTICS_COLLECTION_ID = process.env.ANALYTICS_COLLECTION_ID || 'analytics_telemetry';

// Routes
app.get('/', (req, res) => {
    res.send('VanishLink API is running');
});

// Create Link
const WORKSPACES_COLLECTION_ID = process.env.WORKSPACES_COLLECTION_ID;

// Workspace Routes
app.get('/api/workspaces', async (req, res) => {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            process.env.WORKSPACES_COLLECTION_ID,
            [Query.orderAsc('name')]
        );
        res.json(response.documents);
    } catch (error) {
        console.error('Error fetching workspaces:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/workspaces', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const doc = await databases.createDocument(
            DATABASE_ID,
            process.env.WORKSPACES_COLLECTION_ID,
            ID.unique(),
            { name }
        );
        res.json(doc);
    } catch (error) {
        console.error('Error creating workspace:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/workspaces/:id', async (req, res) => {
    try {
        await databases.deleteDocument(DATABASE_ID, process.env.WORKSPACES_COLLECTION_ID, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List Links with pagination
app.get('/api/links', async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const limit = Math.min(parseInt(req.query.limit) || 25, 100);
        const offset = parseInt(req.query.offset) || 0;

        const queries = [Query.limit(limit), Query.offset(offset)];

        if (workspaceId) {
            if (workspaceId === 'personal') {
                queries.push(Query.isNull('workspaceId'));
            } else {
                queries.push(Query.equal('workspaceId', workspaceId));
            }
        }

        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, queries);
        res.json({ documents: response.documents, total: response.total });
    } catch (error) {
        console.error('Error fetching links:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rate limiter for POST /api/shorten — fixed window per client IP
const shortenRateLimiter = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 20;

function checkRateLimit(ip) {
    const now = Date.now();
    // Bound memory: once the map grows large, drop IPs whose window has lapsed
    if (shortenRateLimiter.size > 1000) {
        for (const [key, entry] of shortenRateLimiter) {
            if (now >= entry.resetAt) shortenRateLimiter.delete(key);
        }
    }
    let entry = shortenRateLimiter.get(ip);
    if (!entry || now >= entry.resetAt) {
        entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
        shortenRateLimiter.set(ip, entry);
    }
    entry.count += 1;
    return entry.count <= RATE_MAX_REQUESTS;
}

// --- Counter write coalescing -------------------------------------------------
// Click/burn/generate counters are accumulated in memory and flushed to
// Appwrite in batches. This removes a document write from every redirect and
// eliminates the lost-update race of the old per-request read-modify-write.
const pendingIncrements = new Map(); // docId -> { clicks, burnedCount, generatedCount }
const INCREMENT_FLUSH_MS = 3000;
let flushingIncrements = false;

function queueIncrement(docId, fields) {
    const current = pendingIncrements.get(docId) || { clicks: 0, burnedCount: 0, generatedCount: 0 };
    for (const [key, value] of Object.entries(fields)) {
        current[key] = (current[key] || 0) + value;
    }
    pendingIncrements.set(docId, current);
}

async function flushPendingIncrements() {
    if (flushingIncrements || pendingIncrements.size === 0) return;
    flushingIncrements = true;
    try {
        for (const [docId, delta] of [...pendingIncrements.entries()]) {
            try {
                const snapshot = { clicks: delta.clicks, burnedCount: delta.burnedCount, generatedCount: delta.generatedCount };
                await withDocLock(docId, async () => {
                    const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, docId);
                    const update = {};
                    if (snapshot.clicks) update.clicks = (doc.clicks || 0) + snapshot.clicks;
                    if (snapshot.burnedCount) update.burnedCount = (doc.burnedCount || 0) + snapshot.burnedCount;
                    if (snapshot.generatedCount) update.generatedCount = (doc.generatedCount || 0) + snapshot.generatedCount;
                    await databases.updateDocument(DATABASE_ID, COLLECTION_ID, docId, update);
                });
                // Subtract what was persisted; clicks queued while the write was
                // in flight must survive for the next flush
                for (const key of Object.keys(snapshot)) {
                    delta[key] -= snapshot[key] || 0;
                }
                if (!Object.values(delta).some(v => v > 0)) {
                    pendingIncrements.delete(docId);
                }
            } catch (e) {
                if (e.code === 404) {
                    // Link was deleted — drop its pending counters
                    pendingIncrements.delete(docId);
                } else {
                    console.error('Error flushing counter increments:', e);
                    // Keep the delta so the next flush retries it
                }
            }
        }
    } finally {
        flushingIncrements = false;
    }
}

setInterval(() => {
    flushPendingIncrements().catch(() => {});
}, INCREMENT_FLUSH_MS).unref();

// --- Per-document operation lock ----------------------------------------------
// Serializes read-modify-write cycles per document within this process, so
// concurrent requests (e.g. two simultaneous opens of a one-time link) cannot
// interleave and double-burn / double-count.
const docLocks = new Map();

function withDocLock(docId, fn) {
    const tail = (docLocks.get(docId) || Promise.resolve()).catch(() => {});
    const run = tail.then(fn);
    const next = run.catch(() => {});
    docLocks.set(docId, next);
    next.then(() => {
        if (docLocks.get(docId) === next) docLocks.delete(docId);
    });
    return run;
}

// Burn a one-time link atomically: re-reads the doc inside the lock and only
// redirects the caller that performed the active -> inactive transition.
async function burnOneTimeLink(docId) {
    return withDocLock(docId, async () => {
        const fresh = await databases.getDocument(DATABASE_ID, COLLECTION_ID, docId);
        if (!fresh.active) return false;
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID, docId, {
            active: false,
            clicks: (fresh.clicks || 0) + 1,
            burnedCount: (fresh.burnedCount || 0) + 1
        });
        return true;
    });
}

// --- Redirect cache ------------------------------------------------------------
// Short-TTL in-memory cache for the redirect hot path. Only permanent standard
// links are cached: one-time links must burn on open and 24h links flip to
// inactive on expiry, so both always hit the database. Dashboard edits/deletes
// that go straight to Appwrite are picked up when the TTL lapses.
const redirectCache = new Map(); // slug -> { $id, url, cachedAt }
const REDIRECT_CACHE_TTL_MS = 30 * 1000;
const REDIRECT_CACHE_MAX = 1000;

function redirectCacheGet(slug) {
    const entry = redirectCache.get(slug);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > REDIRECT_CACHE_TTL_MS) {
        redirectCache.delete(slug);
        return null;
    }
    return entry;
}

function redirectCacheSet(slug, doc) {
    if (doc.type !== 'standard' || !doc.active || doc.expiresAt) return;
    if (redirectCache.size >= REDIRECT_CACHE_MAX) {
        redirectCache.delete(redirectCache.keys().next().value);
    }
    redirectCache.delete(slug); // re-insert so LRU order follows recency
    redirectCache.set(slug, { $id: doc.$id, url: doc.url, cachedAt: Date.now() });
}

function redirectCacheInvalidate(slug) {
    redirectCache.delete(slug);
}

// Create Link
app.post('/api/shorten', async (req, res) => {
    // Rate limiting
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        const { url, type, parentId, slug, workspaceId } = req.body;

        if (!url || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Prevent recursive shortening using SHORT_URL_BASE if configured, falling back to request host
        const shortUrlBase = process.env.SHORT_URL_BASE;
        const currentHost = req.get('host');
        try {
            const urlObj = new URL(url);
            let isRecursive = false;
            if (shortUrlBase) {
                try {
                    const shortUrlObj = new URL(shortUrlBase);
                    if (urlObj.host === shortUrlObj.host) {
                        isRecursive = true;
                    }
                } catch (e) {}
            }
            if (!shortUrlBase && urlObj.host === currentHost) {
                isRecursive = true;
            }
            if (isRecursive) {
                return res.status(400).json({ error: 'You cannot shorten a URL from this service.' });
            }
        } catch (e) {
            // Invalid URL, let Appwrite validation handle it or fail later
        }

        // Validate custom slug if provided
        if (slug) {
            if (slug.length < 3 || slug.length > 50) {
                return res.status(400).json({ error: 'Custom slug must be 3-50 characters long.' });
            }
            if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
                return res.status(400).json({ error: 'Custom slug must be alphanumeric with hyphens only.' });
            }
            const reservedWords = ['api', 'dashboard', 'admin', 'login', 'static', 'favicon.png', 'health'];
            if (reservedWords.includes(slug.toLowerCase())) {
                return res.status(400).json({ error: 'This slug is reserved. Please choose another.' });
            }
        }

        const generatedSlug = slug || crypto.randomBytes(4).toString('hex');

        // Check for slug collision
        const existingSlug = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [Query.equal('slug', generatedSlug), Query.limit(1)]
        );
        if (existingSlug.documents.length > 0) {
            return res.status(409).json({ error: 'This custom slug is already taken. Please choose another.' });
        }

        let expiresAt = null;
        if (type === '24h') {
            const date = new Date();
            date.setHours(date.getHours() + 24);
            expiresAt = date.toISOString();
        }

        const payload = {
            url,
            type,
            slug: generatedSlug,
            active: true,
            clicks: 0,
            generatedCount: 0,
            burnedCount: 0,
            workspaceId: workspaceId || null
        };

        if (expiresAt) {
            payload.expiresAt = expiresAt;
        }

        if (parentId) {
            payload.parentId = parentId;
            // Increment generatedCount on parent (batched, race-free)
            queueIncrement(parentId, { generatedCount: 1 });
        }



        const doc = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            ID.unique(),
            payload
        );

        const activeBase = shortUrlBase ? (shortUrlBase.endsWith('/') ? shortUrlBase.slice(0, -1) : shortUrlBase) : `${req.protocol}://${currentHost}`;
        res.json({
            shortUrl: `${activeBase}/${generatedSlug}`,
            slug: generatedSlug,
            originalUrl: url,
            type,
            expiresAt,
            parentId,
            workspaceId: payload.workspaceId
        });

    } catch (error) {
        // Check for duplicate/conflict slug error
        const errMsg = (error.message || '').toLowerCase();
        if (error.code === 409 || errMsg.includes('duplicate') || errMsg.includes('already exists')) {
            return res.status(409).json({ error: 'This custom slug is already taken. Please choose another.' });
        }
        console.error('Error creating link:', error);
        res.status(500).json({ error: error.message });
    }
});

// Reset Stats for a single link
app.post('/api/reset/:slug', async (req, res) => {
    try {
        // Drain queued counter writes first so they cannot re-add counts after the reset
        await flushPendingIncrements();
        const { slug } = req.params;

        // Look up document by slug field first, fall back to document ID for old links
        let docId;
        try {
            const slugResponse = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID,
                [Query.equal('slug', slug), Query.limit(1)]
            );
            if (slugResponse.documents.length > 0) {
                docId = slugResponse.documents[0].$id;
            } else {
                docId = slug;
            }
        } catch (e) {
            docId = slug;
        }

        const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_ID, docId, {
            clicks: 0,
            generatedCount: 0,
            burnedCount: 0
        });

        // Delete associated click telemetry logs
        try {
            const logsResponse = await databases.listDocuments(
                DATABASE_ID,
                ANALYTICS_COLLECTION_ID,
                [
                    Query.equal('linkId', docId),
                    Query.limit(100)
                ]
            );
            const deletePromises = logsResponse.documents.map(log =>
                databases.deleteDocument(DATABASE_ID, ANALYTICS_COLLECTION_ID, log.$id)
            );
            await Promise.all(deletePromises);
        } catch (err) {
            console.error('Error cleaning up analytics logs on reset:', err);
        }

        res.json(doc);
    } catch (error) {
        console.error('Error resetting link stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Reset All Stats (optionally filtered by workspace)
app.post('/api/reset-all', async (req, res) => {
    try {
        await flushPendingIncrements();
        const { workspaceId } = req.body;
        const queries = [];
        
        if (workspaceId !== undefined && workspaceId !== 'all') {
            if (workspaceId === null || workspaceId === 'personal') {
                queries.push(Query.isNull('workspaceId'));
            } else {
                queries.push(Query.equal('workspaceId', workspaceId));
            }
        }
        
        // Fetch up to 100 documents to reset
        queries.push(Query.limit(100));
        
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, queries);
        const updatePromises = response.documents.map(doc => 
            databases.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, {
                clicks: 0,
                generatedCount: 0,
                burnedCount: 0
            })
        );
        
        await Promise.all(updatePromises);
        res.json({ success: true, count: response.documents.length });
    } catch (error) {
        console.error('Error resetting all stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Scheduled maintenance — point a cron job at this endpoint (see README).
// Marks links whose expiresAt has passed as inactive (the redirect path only
// does this lazily on visit), and optionally prunes click telemetry older than
// ANALYTICS_RETENTION_DAYS. Protect with SWEEP_TOKEN when exposed.
app.post('/api/sweep', async (req, res) => {
    const sweepToken = process.env.SWEEP_TOKEN;
    if (sweepToken && req.get('x-sweep-token') !== sweepToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        await flushPendingIncrements();

        let expiredCount = 0;
        while (true) {
            const batch = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
                Query.equal('active', true),
                Query.lessThan('expiresAt', new Date().toISOString()),
                Query.limit(100)
            ]);
            if (batch.documents.length === 0) break;
            await Promise.all(batch.documents.map(doc =>
                databases.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, { active: false })
            ));
            expiredCount += batch.documents.length;
            if (batch.documents.length < 100) break;
        }

        let prunedLogs = 0;
        const retentionDays = parseInt(process.env.ANALYTICS_RETENTION_DAYS, 10);
        if (!Number.isNaN(retentionDays) && retentionDays > 0) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - retentionDays);
            while (true) {
                const batch = await databases.listDocuments(DATABASE_ID, ANALYTICS_COLLECTION_ID, [
                    Query.lessThan('timestamp', cutoff.toISOString()),
                    Query.limit(100)
                ]);
                if (batch.documents.length === 0) break;
                await Promise.all(batch.documents.map(log =>
                    databases.deleteDocument(DATABASE_ID, ANALYTICS_COLLECTION_ID, log.$id)
                ));
                prunedLogs += batch.documents.length;
                if (batch.documents.length < 100) break;
            }
        }

        res.json({ success: true, expiredLinks: expiredCount, prunedLogs });
    } catch (error) {
        console.error('Error during sweep:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper to track clicks asynchronously
// Country resolution is offline via geoip-lite's local database, so the raw IP
// never leaves this server — it is hashed and discarded right after.
let geoip = null;
try {
    geoip = require('geoip-lite');
} catch (e) {
    console.warn('geoip-lite is not installed — analytics will not record countries');
}

function trackClickAsync(docId, req) {
    const userAgent = req.get('user-agent') || '';
    const rawReferrer = req.get('referrer') || req.get('referer') || 'Direct';
    
    // Parse user agent
    const ua = userAgent.toLowerCase();
    let device = 'desktop';
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
        device = 'tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua)) {
        device = 'mobile';
    }
    
    let browser = 'Other';
    if (ua.includes('edge') || ua.includes('edg/')) {
        browser = 'Edge';
    } else if (ua.includes('firefox') || ua.includes('fxios')) {
        browser = 'Firefox';
    } else if (ua.includes('chrome') || ua.includes('criorig') || ua.includes('crios')) {
        browser = 'Chrome';
    } else if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android')) {
        browser = 'Safari';
    }

    // Parse referrer
    let referrer = 'Direct';
    if (rawReferrer && rawReferrer !== 'Direct') {
        try {
            const urlObj = new URL(rawReferrer);
            const host = urlObj.hostname.toLowerCase();
            if (host.includes('t.co') || host.includes('twitter.com') || host.includes('facebook.com') || host.includes('instagram.com') || host.includes('linkedin.com') || host.includes('reddit.com') || host.includes('tiktok.com') || host.includes('youtube.com') || host.includes('pinterest.com')) {
                referrer = 'Social Media';
            } else {
                referrer = 'Referral';
            }
        } catch (e) {
            referrer = 'Referral';
        }
    }

    // Hash client IP (privacy-preserving)
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    // Resolve country from the IP before it is discarded
    let country = null;
    if (geoip && ip) {
        try {
            const geo = geoip.lookup(ip);
            if (geo && geo.country) country = geo.country;
        } catch (e) {
            // GeoIP is best-effort; never let it break click tracking
        }
    }

    // Create log in background
    const payload = {
        linkId: docId,
        timestamp: new Date().toISOString(),
        browser,
        device,
        referrer,
        ipHash
    };
    if (country) payload.country = country;

    databases.createDocument(
        DATABASE_ID,
        ANALYTICS_COLLECTION_ID,
        ID.unique(),
        payload
    ).catch(err => {
        // Schemas created before the country attribute existed reject the
        // field — retry once without it so the click log is not lost
        const msg = (err.message || '').toLowerCase();
        if (payload.country && (msg.includes('attribute') || msg.includes('country'))) {
            const { country: _omit, ...rest } = payload;
            databases.createDocument(
                DATABASE_ID,
                ANALYTICS_COLLECTION_ID,
                ID.unique(),
                rest
            ).catch(retryErr => {
                console.error('Error writing analytics document to Appwrite:', retryErr);
            });
        } else {
            console.error('Error writing analytics document to Appwrite:', err);
        }
    });
}

// Get Analytics for a link
app.get('/api/analytics/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Try fetching by document ID first, fall back to slug field lookup
        let link;
        let linkId;
        try {
            link = await databases.getDocument(DATABASE_ID, COLLECTION_ID, id);
            linkId = link.$id;
        } catch (e) {
            // Document ID lookup failed — try slug field
            const slugResponse = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID,
                [Query.equal('slug', id), Query.limit(1)]
            );
            if (slugResponse.documents.length === 0) {
                return res.status(404).json({ error: 'Link not found' });
            }
            link = slugResponse.documents[0];
            linkId = link.$id;
        }

        // Fetch click logs from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const logsResponse = await databases.listDocuments(
            DATABASE_ID,
            ANALYTICS_COLLECTION_ID,
            [
                Query.equal('linkId', linkId),
                Query.greaterThanEqual('timestamp', sevenDaysAgo.toISOString()),
                Query.limit(5000)
            ]
        );

        const logs = logsResponse.documents;

        // Initialize structures
        const devices = { mobile: 0, desktop: 0, tablet: 0 };
        const browsers = { chrome: 0, safari: 0, firefox: 0, edge: 0, other: 0 };
        const referrersCount = { Direct: 0, 'Social Media': 0, Referral: 0 };
        const countryCounts = {};
        const uniqueIps = new Set();

        // Calculate click distribution over the last 7 days
        const dailyClicksMap = {};
        for (let i = 0; i < 7; i++) {
            const dateStr = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            dailyClicksMap[dateStr] = 0;
        }

        logs.forEach(log => {
            // Devices
            const device = log.device || 'desktop';
            if (devices[device] !== undefined) {
                devices[device]++;
            } else {
                devices.desktop++;
            }

            // Browsers
            const browser = (log.browser || 'Other').toLowerCase();
            if (browsers[browser] !== undefined) {
                browsers[browser]++;
            } else {
                browsers.other++;
            }

            // Referrers
            const ref = log.referrer || 'Direct';
            if (referrersCount[ref] !== undefined) {
                referrersCount[ref]++;
            } else {
                referrersCount.Referral++;
            }

            // Unique IP hash
            if (log.ipHash) {
                uniqueIps.add(log.ipHash);
            }

            // Countries (only present on logs written after the geo migration)
            if (log.country) {
                countryCounts[log.country] = (countryCounts[log.country] || 0) + 1;
            }

            // Clicks Over Time
            try {
                const logDateStr = new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                if (dailyClicksMap[logDateStr] !== undefined) {
                    dailyClicksMap[logDateStr]++;
                }
            } catch (e) {
                // Ignore parsing errors
            }
        });

        // Compute percentages
        const totalLogs = logs.length || 1;
        const devicePercentages = {
            mobile: Math.round((devices.mobile / totalLogs) * 100),
            desktop: Math.round((devices.desktop / totalLogs) * 100),
            tablet: Math.round((devices.tablet / totalLogs) * 100)
        };
        if (logs.length > 0) {
            const sumDev = devicePercentages.mobile + devicePercentages.desktop + devicePercentages.tablet;
            if (sumDev !== 100) {
                devicePercentages.desktop += (100 - sumDev);
            }
        }

        const browserPercentages = {
            chrome: Math.round((browsers.chrome / totalLogs) * 100),
            safari: Math.round((browsers.safari / totalLogs) * 100),
            firefox: Math.round((browsers.firefox / totalLogs) * 100),
            edge: Math.round((browsers.edge / totalLogs) * 100)
        };
        if (logs.length > 0) {
            const sumBrowser = browserPercentages.chrome + browserPercentages.safari + browserPercentages.firefox + browserPercentages.edge;
            if (sumBrowser !== 100) {
                browserPercentages.chrome += (100 - sumBrowser);
            }
        }

        // Format referrers list
        const referrers = [
            { source: 'Direct', count: referrersCount.Direct },
            { source: 'Social Media', count: referrersCount['Social Media'] },
            { source: 'Referral', count: referrersCount.Referral }
        ].filter(r => r.count > 0);

        // Format clicks over time list
        const clicksOverTime = Object.entries(dailyClicksMap).map(([date, count]) => ({
            date,
            clicks: count
        }));

        // Top countries by click count
        const countries = Object.entries(countryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([country, count]) => ({ country, count }));

        res.json({
            totalClicks: link.clicks || 0,
            uniqueVisitors: uniqueIps.size,
            avgTimeOnPage: null,
            bounceRate: null,
            devices: devicePercentages,
            browsers: browserPercentages,
            referrers,
            countries,
            clicksOverTime
        });

    } catch (error) {
        console.error('Error fetching analytics for link:', error);
        res.status(500).json({ error: error.message });
    }
});

// Edit Link URL
app.put('/api/links/:id', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        try {
            new URL(url);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL' });
        }
        // Look up document by slug field first, fall back to document ID
        let docId = req.params.id;
        try {
            const slugResponse = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID,
                [Query.equal('slug', req.params.id), Query.limit(1)]
            );
            if (slugResponse.documents.length > 0) {
                docId = slugResponse.documents[0].$id;
            }
        } catch (e) {}
        const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_ID, docId, { url });
        redirectCacheInvalidate(req.params.id);
        res.json(doc);
    } catch (error) {
        if (error.code === 404) {
            return res.status(404).json({ error: 'Link not found' });
        }
        console.error('Error updating link:', error);
        res.status(500).json({ error: error.message });
    }
});

// Redirect Logic
app.get('/:slug', async (req, res) => {
    const { slug } = req.params;

    // Hot path: permanent standard links skip the database entirely
    const cached = redirectCacheGet(slug);
    if (cached) {
        queueIncrement(cached.$id, { clicks: 1 });
        trackClickAsync(cached.$id, req);
        return res.redirect(cached.url);
    }

    try {
        // Look up by slug field first, fall back to document ID for old links
        let doc;
        try {
            const slugResponse = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID,
                [Query.equal('slug', slug), Query.limit(1)]
            );
            if (slugResponse.documents.length > 0) {
                doc = slugResponse.documents[0];
            } else {
                doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, slug);
            }
        } catch (e) {
            doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, slug);
        }

        if (!doc || !doc.active) {
            return res.status(410).send('Link has expired or been burned');
        }

        // Check Expiration
        if (doc.expiresAt) {
            const now = new Date();
            const expires = new Date(doc.expiresAt);
            if (now > expires) {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, { active: false });
                return res.status(410).send('Link has expired');
            }
        }

        // Check One-Time — only the request that performs the active -> inactive
        // transition gets redirected; concurrent openers receive 410
        if (doc.type === 'onetime') {
            const burned = await burnOneTimeLink(doc.$id);
            if (!burned) {
                return res.status(410).send('Link has expired or been burned');
            }

            // Update Parent Burned Count (batched)
            if (doc.parentId) {
                queueIncrement(doc.parentId, { burnedCount: 1 });
            }

            trackClickAsync(doc.$id, req);

            return res.redirect(doc.url);
        }

        // Standard: queue click counter (batched flush)
        queueIncrement(doc.$id, { clicks: 1 });

        trackClickAsync(doc.$id, req);

        redirectCacheSet(slug, doc);

        return res.redirect(doc.url);

    } catch (error) {
        // Appwrite throws 404 if not found
        if (error.code === 404) {
            return res.status(404).send('Link not found');
        }
        console.error('Redirect error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
