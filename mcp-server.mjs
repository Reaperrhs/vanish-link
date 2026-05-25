import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Client, Databases, Query, ID } from "node-appwrite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env configuration from backend/.env
dotenv.config({ path: path.join(__dirname, "backend", ".env") });

const PORT = process.env.PORT || 3000;
const API_BASE_URL = `http://localhost:${PORT}`;

// Appwrite Setup
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.DATABASE_ID;
const COLLECTION_ID = process.env.COLLECTION_ID;
const WORKSPACES_COLLECTION_ID = process.env.WORKSPACES_COLLECTION_ID;

// Create MCP Server Instance
const server = new Server(
    {
        name: "vanish-link-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// 1. List Available Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "shorten_url",
                description: "Shorten a long destination URL using VanishLink.",
                inputSchema: {
                    type: "object",
                    properties: {
                        url: {
                            type: "string",
                            description: "The long destination URL to shorten (e.g. 'https://github.com').",
                        },
                        type: {
                            type: "string",
                            enum: ["standard", "onetime", "24h"],
                            description: "The expiration behavior. 'standard' (never expires), 'onetime' (burn after reading), '24h' (expires in 24 hours). Defaults to 'standard'.",
                        },
                        slug: {
                            type: "string",
                            description: "Optional custom slug / alias for the short link (e.g., 'custom-slug').",
                        },
                        workspaceId: {
                            type: "string",
                            description: "Optional workspace ID to group this link under.",
                        },
                    },
                    required: ["url"],
                },
            },
            {
                name: "list_links",
                description: "Retrieve a list of shortened links.",
                inputSchema: {
                    type: "object",
                    properties: {
                        workspaceId: {
                            type: "string",
                            description: "Filter links by workspace. Use 'all' for all links, 'personal' for links with no workspace, or pass a specific workspace ID. Defaults to 'all'.",
                        },
                    },
                },
            },
            {
                name: "get_link_analytics",
                description: "Get detailed analytics and metrics for a shortened link.",
                inputSchema: {
                    type: "object",
                    properties: {
                        slug: {
                            type: "string",
                            description: "The slug/alias of the link (e.g. 'custom-slug').",
                        },
                    },
                    required: ["slug"],
                },
            },
            {
                name: "list_workspaces",
                description: "List all workspaces defined in VanishLink.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "create_workspace",
                description: "Create a new workspace to organize links.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "The name of the new workspace.",
                        },
                    },
                    required: ["name"],
                },
            },
        ],
    };
});

// Helper: Shorten URL directly in Appwrite (Fallback)
async function shortenDirect(url, type = "standard", slug, workspaceId) {
    const generatedSlug = slug || Math.random().toString(36).substring(2, 8);
    let expiresAt = null;

    if (type === "24h") {
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
        workspaceId: workspaceId || null,
    };

    if (expiresAt) {
        payload.expiresAt = expiresAt;
    }

    const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        generatedSlug,
        payload
    );

    return {
        shortUrl: `http://localhost:${PORT}/${generatedSlug}`,
        slug: generatedSlug,
        originalUrl: url,
        type,
        expiresAt,
        workspaceId: payload.workspaceId,
    };
}

// 2. Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case "shorten_url": {
                const { url, type = "standard", slug, workspaceId } = args;

                try {
                    // Try to use the running Express backend first
                    const response = await fetch(`${API_BASE_URL}/api/shorten`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url, type, slug, workspaceId }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Link shortened successfully:\n- Short URL: ${data.shortUrl}\n- Destination: ${data.originalUrl}\n- Type: ${data.type}\n- Workspace: ${data.workspaceId || "Personal"}`,
                                }
                            ]
                        };
                    }
                } catch (err) {
                    // Express server is likely not running, fallback to direct DB write
                }

                const data = await shortenDirect(url, type, slug, workspaceId);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Link shortened directly via Database:\n- Short URL: ${data.shortUrl}\n- Destination: ${data.originalUrl}\n- Type: ${data.type}\n- Workspace: ${data.workspaceId || "Personal"}`,
                        }
                    ]
                };
            }

            case "list_links": {
                const { workspaceId = "all" } = args || {};
                const queries = [Query.orderDesc("$createdAt"), Query.limit(100)];
                queries.push(Query.isNull("parentId")); // Exclude child links

                if (workspaceId !== "all") {
                    if (workspaceId === "personal") {
                        queries.push(Query.isNull("workspaceId"));
                    } else {
                        queries.push(Query.equal("workspaceId", workspaceId));
                    }
                }

                const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, queries);
                
                if (response.documents.length === 0) {
                    return {
                        content: [{ type: "text", text: "No links found." }]
                    };
                }

                const lines = response.documents.map((doc) => {
                    const status = !doc.active ? "Archived" : doc.type === "onetime" ? "One-time" : doc.type === "24h" ? "24h Expiry" : "Standard";
                    return `- /${doc.slug} ➔ ${doc.url} (${doc.clicks} clicks | Status: ${status} | Workspace: ${doc.workspaceId || "Personal"})`;
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: `Links (${response.documents.length} found):\n${lines.join("\n")}`,
                        }
                    ]
                };
            }

            case "get_link_analytics": {
                const { slug } = args;
                
                const link = await databases.getDocument(DATABASE_ID, COLLECTION_ID, slug);
                const children = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
                    Query.equal("parentId", slug),
                    Query.limit(100)
                ]);

                const status = !link.active ? "Archived/Burned" : link.type === "onetime" ? "One-time" : link.type === "24h" ? "24h Expiry" : "Standard";
                let text = `Link Analytics for /${link.slug}:\n`;
                text += `- ID: ${link.$id}\n`;
                text += `- Destination URL: ${link.url}\n`;
                text += `- Type: ${link.type}\n`;
                text += `- Status: ${status}\n`;
                text += `- Total Click Volume: ${link.clicks}\n`;
                text += `- Child Links Generated: ${link.generatedCount || 0}\n`;
                text += `- Child Links Burned: ${link.burnedCount || 0}\n`;
                text += `- Created At: ${link.$createdAt ? new Date(link.$createdAt).toLocaleString() : "N/A"}\n`;
                if (link.expiresAt) {
                    text += `- Expires At: ${new Date(link.expiresAt).toLocaleString()}\n`;
                }

                if (children.documents.length > 0) {
                    text += `\nChild Links Generated Under This Master Link:\n`;
                    children.documents.forEach((child) => {
                        const childStatus = !child.active ? "Burned" : "Active";
                        text += `- /${child.slug} (Clicks: ${child.clicks} | Status: ${childStatus})\n`;
                    });
                }

                return {
                    content: [{ type: "text", text }]
                };
            }

            case "list_workspaces": {
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    WORKSPACES_COLLECTION_ID,
                    [Query.orderAsc("name")]
                );

                if (response.documents.length === 0) {
                    return {
                        content: [{ type: "text", text: "No workspaces found." }]
                    };
                }

                const lines = response.documents.map((w) => `- ${w.name} (ID: ${w.$id})`);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Workspaces (${response.documents.length} found):\n${lines.join("\n")}`,
                        }
                    ]
                };
            }

            case "create_workspace": {
                const { name } = args;

                const doc = await databases.createDocument(
                    DATABASE_ID,
                    WORKSPACES_COLLECTION_ID,
                    ID.unique(),
                    { name }
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: `Workspace '${doc.name}' created successfully (ID: ${doc.$id}).`,
                        }
                    ]
                };
            }

            default:
                throw new Error(`Tool not found: ${name}`);
        }
    } catch (error) {
        return {
            isError: true,
            content: [
                {
                    type: "text",
                    text: `Error executing tool '${name}': ${error.message}`,
                }
            ]
        };
    }
});

// Run Server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("VanishLink MCP Server running on stdio transport");
