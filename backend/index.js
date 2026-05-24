const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { Client, Databases, Query, ID } = require('node-appwrite');

dotenv.config({ path: path.join(__dirname, '.env') });

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

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

// Create Link
app.post('/api/shorten', async (req, res) => {
    try {
        const { url, type, parentId, slug, workspaceId } = req.body;

        if (!url || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Prevent recursive shortening
        const currentHost = req.get('host');
        try {
            const urlObj = new URL(url);
            if (urlObj.host === currentHost) {
                return res.status(400).json({ error: 'You cannot shorten a URL from this service.' });
            }
        } catch (e) {
            // Invalid URL, let Appwrite validation handle it or fail later
        }

        const generatedSlug = slug || Math.random().toString(36).substring(2, 8);

        let expiresAt = null;
        if (type === '24h') {
            const date = new Date();
            date.setHours(date.getHours() + 24);
            expiresAt = date.toISOString();
        }

        const payload = {
            url,
            type,
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
            // Increment generatedCount on parent
            try {
                const parent = await databases.getDocument(DATABASE_ID, COLLECTION_ID, parentId);
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID, parentId, {
                    generatedCount: (parent.generatedCount || 0) + 1
                });
            } catch (e) {
                console.error('Error updating parent count:', e);
            }
        }



        const doc = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            generatedSlug,
            payload
        );

        res.json({
            shortUrl: `${req.protocol}://${req.get('host')}/${generatedSlug}`,
            slug: generatedSlug,
            originalUrl: url,
            type,
            expiresAt,
            parentId,
            workspaceId: payload.workspaceId
        });

    } catch (error) {
        console.error('Error creating link:', error);
        res.status(500).json({ error: error.message });
    }
});

// Reset Stats for a single link
app.post('/api/reset/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_ID, slug, {
            clicks: 0,
            generatedCount: 0,
            burnedCount: 0
        });
        res.json(doc);
    } catch (error) {
        console.error('Error resetting link stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Reset All Stats (optionally filtered by workspace)
app.post('/api/reset-all', async (req, res) => {
    try {
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

// Redirect Logic
app.get('/:slug', async (req, res) => {
    const { slug } = req.params;

    try {
        const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, slug);

        if (!doc || !doc.active) {
            return res.status(410).send('Link has expired or been burned');
        }

        // Check Expiration
        if (doc.expiresAt) {
            const now = new Date();
            const expires = new Date(doc.expiresAt);
            if (now > expires) {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID, slug, { active: false });
                return res.status(410).send('Link has expired');
            }
        }

        // Check One-Time
        if (doc.type === 'onetime') {
            // Soft Delete (Burn)
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID, slug, {
                active: false,
                clicks: (doc.clicks || 0) + 1,
                burnedCount: (doc.burnedCount || 0) + 1
            });

            // Update Parent Burned Count
            if (doc.parentId) {
                try {
                    const parent = await databases.getDocument(DATABASE_ID, COLLECTION_ID, doc.parentId);
                    await databases.updateDocument(DATABASE_ID, COLLECTION_ID, doc.parentId, {
                        burnedCount: (parent.burnedCount || 0) + 1
                    });
                } catch (e) {
                    console.error('Error updating parent burned count:', e);
                }
            }

            return res.redirect(doc.url);
        }

        // Standard: Update clicks
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID, slug, {
            clicks: (doc.clicks || 0) + 1
        });

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
