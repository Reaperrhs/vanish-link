const { Client, Databases } = require('node-appwrite');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.DATABASE_ID;
const COLLECTION_ID = process.env.COLLECTION_ID;

async function setupAdvancedSchema() {
    try {
        console.log('Creating parentId attribute...');
        await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'parentId', 255, false);
        console.log('parentId created.');
    } catch (e) {
        console.log('parentId might already exist:', e.message);
    }

    try {
        console.log('Creating generatedCount attribute...');
        await databases.createIntegerAttribute(DATABASE_ID, COLLECTION_ID, 'generatedCount', false, 0, 2147483647); // min 0
        console.log('generatedCount created.');
    } catch (e) {
        console.log('generatedCount might already exist:', e.message);
    }

    try {
        console.log('Creating burnedCount attribute...');
        await databases.createIntegerAttribute(DATABASE_ID, COLLECTION_ID, 'burnedCount', false, 0, 2147483647); // min 0
        console.log('burnedCount created.');
    } catch (e) {
        console.log('burnedCount might already exist:', e.message);
    }

    // Wait for attributes to be available (Appwrite is async)
    console.log('Waiting for attributes to be processed...');
}

setupAdvancedSchema();
