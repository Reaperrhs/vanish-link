// Adds the optional `country` attribute (ISO 3166 alpha-2, e.g. "US") to the
// analytics collection so click logs can record the visitor's country. The
// backend resolves it offline via geoip-lite before hashing the IP, and falls
// back to writing logs without a country until this migration has been run.
// Safe to run repeatedly.
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
const ANALYTICS_COLLECTION_ID = process.env.ANALYTICS_COLLECTION_ID || 'analytics_telemetry';

async function main() {
    console.log(`Adding "country" attribute to ${ANALYTICS_COLLECTION_ID}...`);
    try {
        await databases.createStringAttribute(DATABASE_ID, ANALYTICS_COLLECTION_ID, 'country', 2, false);
        console.log('Attribute creation initiated.');
    } catch (e) {
        if (e.code === 409) {
            console.log('Attribute already exists.');
        } else {
            throw e;
        }
    }

    console.log('Waiting for the attribute to become available...');
    while (true) {
        const response = await databases.listAttributes(DATABASE_ID, ANALYTICS_COLLECTION_ID);
        const attr = response.attributes.find(a => a.key === 'country');
        if (!attr || attr.status === 'available') {
            console.log('Attribute is available.');
            break;
        }
        console.log(`Status: ${attr.status} — retrying in 2s...`);
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('Done. New click logs will now include the visitor country.');
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
