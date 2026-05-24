// Test Workspace Feature via API
// using global fetch


const API_BASE = 'http://localhost:3000/api';

async function testWorkspaces() {
    console.log('--- Testing Workspaces ---');

    // 1. Create Workspace
    console.log('\n1. Creating "Verification WS"...');
    let wsId;
    try {
        const res = await fetch(`${API_BASE}/workspaces`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Verification WS' })
        });
        const text = await res.text();
        try {
            const data = JSON.parse(text);
            if (!res.ok) throw new Error(data.error);
            wsId = data.$id;
            console.log(`Success! Created Workspace: ${data.name} (${wsId})`);
        } catch (e) {
            console.error('Failed to parse JSON:', text);
            throw new Error('Server returned non-JSON response');
        }
    } catch (e) {
        console.error('Failed to create workspace:', e.message);
        return;
    }

    // 2. Create Link IN Workspace
    console.log('\n2. Creating link in workspace...');
    let linkId;
    try {
        const res = await fetch(`${API_BASE}/shorten`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: 'https://example.com/workspace-test',
                type: 'standard',
                workspaceId: wsId
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        linkId = data.slug;
        console.log(`Success! Created Link: ${data.shortUrl}`);
        if (data.workspaceId !== wsId) console.error('ERROR: Link workspaceId mismtach!');
        else console.log('Link correctly assigned to workspace.');
    } catch (e) {
        console.error('Failed to create link:', e.message);
    }

    // 3. List Workspaces
    console.log('\n3. Listing Workspaces...');
    try {
        const res = await fetch(`${API_BASE}/workspaces`);
        const list = await res.json();
        console.log(`Found ${list.length} workspaces.`);
        const found = list.find(w => w.$id === wsId);
        if (found) console.log('Verification WS found in list.');
        else console.error('Verification WS NOT found in list!');
    } catch (e) {
        console.error('List failed:', e.message);
    }
}

testWorkspaces();
