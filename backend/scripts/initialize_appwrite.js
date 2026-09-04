const { Client, Databases, Permission, Role } = require('node-appwrite');
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
const WORKSPACES_COLLECTION_ID = process.env.WORKSPACES_COLLECTION_ID;
const ANALYTICS_COLLECTION_ID = process.env.ANALYTICS_COLLECTION_ID || 'analytics_telemetry';

async function createStringAttr(collId, key, size, required, defaultValue = null) {
    try {
        console.log(`Creating string attribute "${key}" on collection "${collId}"...`);
        await databases.createStringAttribute(DATABASE_ID, collId, key, size, required, defaultValue);
        console.log(`Attribute "${key}" creation initiated.`);
    } catch (e) {
        if (e.code === 409) {
            console.log(`Attribute "${key}" already exists.`);
        } else {
            console.error(`Error creating "${key}":`, e.message);
        }
    }
}

async function createBoolAttr(collId, key, required, defaultValue) {
    try {
        console.log(`Creating boolean attribute "${key}" on collection "${collId}"...`);
        await databases.createBooleanAttribute(DATABASE_ID, collId, key, required, defaultValue);
        console.log(`Attribute "${key}" creation initiated.`);
    } catch (e) {
        if (e.code === 409) {
            console.log(`Attribute "${key}" already exists.`);
        } else {
            console.error(`Error creating "${key}":`, e.message);
        }
    }
}

async function createIntAttr(collId, key, required, defaultValue, min = 0, max = 2147483647) {
    try {
        console.log(`Creating integer attribute "${key}" on collection "${collId}"...`);
        await databases.createIntegerAttribute(DATABASE_ID, collId, key, required, min, max, defaultValue);
        console.log(`Attribute "${key}" creation initiated.`);
    } catch (e) {
        if (e.code === 409) {
            console.log(`Attribute "${key}" already exists.`);
        } else {
            console.error(`Error creating "${key}":`, e.message);
        }
    }
}

async function waitForAttributes(collId, keys) {
    console.log(`Waiting for attributes on "${collId}" to be ready...`);
    while (true) {
        const response = await databases.listAttributes(DATABASE_ID, collId);
        const attrs = response.attributes;
        const pending = attrs.filter(a => keys.includes(a.key) && a.status !== 'available');
        if (pending.length === 0) {
            console.log(`All attributes on "${collId}" are ready.`);
            break;
        }
        console.log(`Still waiting for attributes: ${pending.map(a => `${a.key} (${a.status})`).join(', ')}`);
        await new Promise(r => setTimeout(r, 2000));
    }
}

async function main() {
    try {
        console.log('--- Initializing Appwrite Database and Collections ---');
        console.log(`Endpoint: ${process.env.APPWRITE_ENDPOINT}`);
        console.log(`Project ID: ${process.env.APPWRITE_PROJECT_ID}`);
        console.log(`Database ID: ${DATABASE_ID}`);

        // 1. Create Database if not exists
        try {
            await databases.get(DATABASE_ID);
            console.log(`Database "${DATABASE_ID}" already exists.`);
        } catch (e) {
            if (e.code === 404) {
                console.log(`Creating database "${DATABASE_ID}"...`);
                await databases.create(DATABASE_ID, 'VanishLink');
                console.log(`Database "${DATABASE_ID}" created successfully.`);
            } else {
                throw e;
            }
        }

        // 2. Create Links collection if not exists
        try {
            await databases.getCollection(DATABASE_ID, COLLECTION_ID);
            console.log(`Collection "Links" (${COLLECTION_ID}) already exists.`);
        } catch (e) {
            if (e.code === 404) {
                console.log(`Creating "Links" collection (${COLLECTION_ID})...`);
                await databases.createCollection(
                    DATABASE_ID,
                    COLLECTION_ID,
                    'Links',
                    [
                        Permission.read(Role.any()),
                        Permission.create(Role.any()),
                        Permission.update(Role.any()),
                        Permission.delete(Role.any())
                    ]
                );
                console.log(`Collection "Links" created successfully.`);
            } else {
                throw e;
            }
        }

        // 3. Create Workspaces collection if not exists
        try {
            await databases.getCollection(DATABASE_ID, WORKSPACES_COLLECTION_ID);
            console.log(`Collection "Workspaces" (${WORKSPACES_COLLECTION_ID}) already exists.`);
        } catch (e) {
            if (e.code === 404) {
                console.log(`Creating "Workspaces" collection (${WORKSPACES_COLLECTION_ID})...`);
                await databases.createCollection(
                    DATABASE_ID,
                    WORKSPACES_COLLECTION_ID,
                    'Workspaces',
                    [
                        Permission.read(Role.any()),
                        Permission.create(Role.any()),
                        Permission.update(Role.any()),
                        Permission.delete(Role.any())
                    ]
                );
                console.log(`Collection "Workspaces" created successfully.`);
            } else {
                throw e;
            }
        }

        // 3.5. Create Analytics collection if not exists
        try {
            await databases.getCollection(DATABASE_ID, ANALYTICS_COLLECTION_ID);
            console.log(`Collection "Analytics" (${ANALYTICS_COLLECTION_ID}) already exists.`);
        } catch (e) {
            if (e.code === 404) {
                console.log(`Creating "Analytics" collection (${ANALYTICS_COLLECTION_ID})...`);
                await databases.createCollection(
                    DATABASE_ID,
                    ANALYTICS_COLLECTION_ID,
                    'Analytics',
                    [
                        Permission.read(Role.any()),
                        Permission.create(Role.any()),
                        Permission.update(Role.any()),
                        Permission.delete(Role.any())
                    ]
                );
                console.log(`Collection "Analytics" created successfully.`);
            } else {
                throw e;
            }
        }

        // 4. Create Attributes on Links collection
        console.log('\nCreating attributes on Links collection...');
        await createStringAttr(COLLECTION_ID, 'url', 2048, true);
        await createStringAttr(COLLECTION_ID, 'type', 50, true);
        await createBoolAttr(COLLECTION_ID, 'active', false, true);
        await createIntAttr(COLLECTION_ID, 'clicks', false, 0);
        await createStringAttr(COLLECTION_ID, 'expiresAt', 50, false);
        await createStringAttr(COLLECTION_ID, 'parentId', 255, false);
        await createIntAttr(COLLECTION_ID, 'generatedCount', false, 0);
        await createIntAttr(COLLECTION_ID, 'burnedCount', false, 0);
        await createStringAttr(COLLECTION_ID, 'workspaceId', 255, false);

        const linksKeys = ['url', 'type', 'active', 'clicks', 'expiresAt', 'parentId', 'generatedCount', 'burnedCount', 'workspaceId'];
        await waitForAttributes(COLLECTION_ID, linksKeys);

        // 5. Create Attributes on Workspaces collection
        console.log('\nCreating attributes on Workspaces collection...');
        await createStringAttr(WORKSPACES_COLLECTION_ID, 'name', 128, true);

        const workspacesKeys = ['name'];
        await waitForAttributes(WORKSPACES_COLLECTION_ID, workspacesKeys);

        // 5.5. Create Attributes on Analytics collection
        console.log('\nCreating attributes on Analytics collection...');
        await createStringAttr(ANALYTICS_COLLECTION_ID, 'linkId', 255, true);
        await createStringAttr(ANALYTICS_COLLECTION_ID, 'timestamp', 50, true);
        await createStringAttr(ANALYTICS_COLLECTION_ID, 'browser', 128, true);
        await createStringAttr(ANALYTICS_COLLECTION_ID, 'device', 128, true);
        await createStringAttr(ANALYTICS_COLLECTION_ID, 'referrer', 2048, true);
        await createStringAttr(ANALYTICS_COLLECTION_ID, 'ipHash', 255, false);

        const analyticsKeys = ['linkId', 'timestamp', 'browser', 'device', 'referrer', 'ipHash'];
        await waitForAttributes(ANALYTICS_COLLECTION_ID, analyticsKeys);

        // 6. Create Indexes
        console.log('\nCreating Indexes...');
        try {
            console.log('Creating index on Workspaces "name" attribute...');
            await databases.createIndex(
                DATABASE_ID,
                WORKSPACES_COLLECTION_ID,
                'key_name',
                'key',
                ['name'],
                ['asc']
            );
            console.log('Index "key_name" created.');
        } catch (e) {
            if (e.code === 409) {
                console.log('Index "key_name" already exists.');
            } else {
                console.error('Error creating index:', e.message);
            }
        }

        try {
            console.log('Creating index on Analytics "linkId" and "timestamp" attributes...');
            await databases.createIndex(
                DATABASE_ID,
                ANALYTICS_COLLECTION_ID,
                'key_linkId_timestamp',
                'key',
                ['linkId', 'timestamp'],
                ['asc', 'desc']
            );
            console.log('Index "key_linkId_timestamp" created.');
        } catch (e) {
            if (e.code === 409) {
                console.log('Index "key_linkId_timestamp" already exists.');
            } else {
                console.error('Error creating index:', e.message);
            }
        }

        console.log('\n🎉 --- Appwrite database initialization completed successfully! ---');
    } catch (error) {
        console.error('\n❌ Initialization failed:', error);
        process.exit(1);
    }
}

main();
