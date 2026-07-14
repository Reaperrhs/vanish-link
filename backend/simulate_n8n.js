const { Client, Databases } = require('node-appwrite');
const dotenv = require('dotenv');


dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.DATABASE_ID;
const COLLECTION_ID = process.env.COLLECTION_ID;

async function simulateWorkflow() {
    try {
        console.log('--- Starting Simulation ---');

        // 1. Create Master Link (Simulating Dashboard)
        const masterSlug = 'master-' + Math.random().toString(36).substring(7);
        console.log(`1. Creating Master Link: ${masterSlug}`);
        const masterDoc = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            masterSlug,
            {
                url: 'https://example.com',
                type: 'standard',
                active: true,
                clicks: 0,
                generatedCount: 0,
                burnedCount: 0
            }
        );
        const masterId = masterDoc.$id;
        console.log(`   Master ID: ${masterId}`);

        // 2. Create Child Link (Simulating n8n)
        console.log('2. Creating Child Link (via API)...');
        const childResponse = await fetch('http://localhost:3000/api/shorten', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: 'https://example.com',
                type: 'onetime',
                parentId: masterId
            })
        });

        if (!childResponse.ok) {
            const err = await childResponse.text();
            throw new Error(`Failed to create child link: ${err}`);
        }

        const childData = await childResponse.json();
        console.log(`   Child Created: ${childData.slug}`);

        // 3. Verify Generated Count
        console.log('3. Verifying Master Generated Count...');
        // Wait for async update
        await new Promise(r => setTimeout(r, 2000));
        const masterAfterGen = await databases.getDocument(DATABASE_ID, COLLECTION_ID, masterId);
        console.log(`   Generated Count: ${masterAfterGen.generatedCount} (Expected: 1)`);

        // 4. Burn Child Link
        console.log('4. Burning Child Link...');
        await fetch(childData.shortUrl);
        // Wait for async update
        await new Promise(r => setTimeout(r, 2000));

        // 5. Verify Burned Count
        console.log('5. Verifying Master Burned Count...');
        const masterAfterBurn = await databases.getDocument(DATABASE_ID, COLLECTION_ID, masterId);
        console.log(`   Burned Count: ${masterAfterBurn.burnedCount} (Expected: 1)`);

        // 6. Verify Child Status
        console.log('6. Verifying Child Status...');
        const childDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, childData.slug);
        console.log(`   Child Active: ${childDoc.active} (Expected: false)`);

        console.log('--- Simulation Complete ---');

        // Cleanup
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, masterId);
        // Child might be soft deleted, but we can hard delete it for cleanup
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, childData.slug);

    } catch (error) {
        console.error('Error Details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
}

simulateWorkflow();
