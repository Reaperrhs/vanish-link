const { Client, Databases, ID } = require('node-appwrite');
const dotenv = require('dotenv');
const fetch = require('node-fetch'); // Need to install node-fetch or use built-in fetch in newer node

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.DATABASE_ID;
const COLLECTION_ID = process.env.COLLECTION_ID;

async function verifyTracking() {
    try {
        // 1. Create a Link
        const slug = 'test-' + Math.random().toString(36).substring(7);
        const url = 'https://example.com';

        console.log(`Creating link with slug: ${slug}`);
        await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            slug,
            {
                url,
                type: 'standard',
                active: true,
                clicks: 0
            }
        );

        // 2. Hit the Link (simulate click)
        const linkUrl = `http://localhost:3000/${slug}`;
        console.log(`Clicking link: ${linkUrl}`);
        try {
            await fetch(linkUrl);
        } catch (e) {
            // Ignore redirect errors or connection errors if fetch doesn't follow
        }

        // Wait a bit for async update (if any)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 3. Check Clicks
        const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, slug);
        console.log(`Clicks: ${doc.clicks}`);

        if (doc.clicks > 0) {
            console.log('SUCCESS: Tracking is working!');
        } else {
            console.log('FAILURE: Clicks did not increase.');
        }

        // Cleanup
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, slug);

    } catch (error) {
        console.error('Error:', error);
    }
}

verifyTracking();
