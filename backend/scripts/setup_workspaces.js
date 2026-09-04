const { Client, Databases, ID } = require('node-appwrite');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.DATABASE_ID;
const LINKS_COLLECTION_ID = process.env.COLLECTION_ID;

async function setupWorkspaces() {
    console.log('--- Setting up Workspaces ---');

    let WORKSPACES_COLLECTION_ID = process.env.WORKSPACES_COLLECTION_ID;

    // 1. Create Workspaces Collection if not present
    if (!WORKSPACES_COLLECTION_ID) {
        console.log('Creating Workspaces Collection...');
        try {
            const collection = await databases.createCollection(DATABASE_ID, ID.unique(), 'Workspaces');
            WORKSPACES_COLLECTION_ID = collection.$id;
            console.log(`Created Collection 'Workspaces' with ID: ${WORKSPACES_COLLECTION_ID}`);

            // Update .env file
            const envPath = path.join(__dirname, '..', '.env');
            let envContent = fs.readFileSync(envPath, 'utf8');
            if (!envContent.includes('WORKSPACES_COLLECTION_ID=')) {
                fs.appendFileSync(envPath, `\nWORKSPACES_COLLECTION_ID=${WORKSPACES_COLLECTION_ID}\n`);
                console.log('Updated backend/.env with WORKSPACES_COLLECTION_ID');
            }

            console.log('IMPORTANT: You may need to add VITE_WORKSPACES_COLLECTION_ID to frontend/.env as well if accessing directly.');

        } catch (e) {
            console.error('FAILED to create "Workspaces" collection. It seems the API Key has insufficient scope (needs collections.write).');
            console.log('SKIPPING collection creation. Please create it manually in Appwrite Console ("Workspaces") and add WORKSPACES_COLLECTION_ID to .env');
        }
    } else {
        console.log(`Using existing Workspaces Collection ID: ${WORKSPACES_COLLECTION_ID}`);
    }

    // 2. Add 'name' attribute to Workspaces (Only if we have an ID)
    if (WORKSPACES_COLLECTION_ID) {
        try {
            console.log('Adding "name" attribute to Workspaces...');
            await databases.createStringAttribute(DATABASE_ID, WORKSPACES_COLLECTION_ID, 'name', 128, true);
            console.log('Attribute "name" created.');
        } catch (e) {
            if (e.code === 409) console.log('Attribute "name" already exists.');
            else console.error('Error creating "name":', e);
        }
    }

    // 3. Add 'workspaceId' attribute to Links
    try {
        console.log('Adding "workspaceId" attribute to Links...');
        // nullable=true so existing links don't break
        await databases.createStringAttribute(DATABASE_ID, LINKS_COLLECTION_ID, 'workspaceId', 255, false);
        console.log('Attribute "workspaceId" created.');
    } catch (e) {
        if (e.code === 409) console.log('Attribute "workspaceId" already exists.');
        else console.error('Error creating "workspaceId":', e);
    }

    console.log('--- Setup Complete ---');
}

setupWorkspaces();
