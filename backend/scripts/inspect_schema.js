const { Client, Databases } = require('node-appwrite');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.DATABASE_ID;
const COLLECTION_ID = process.env.COLLECTION_ID;

async function inspect() {
    try {
        const response = await databases.listAttributes(DATABASE_ID, COLLECTION_ID);
        console.log('Attributes:', JSON.stringify(response.attributes, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

inspect();
