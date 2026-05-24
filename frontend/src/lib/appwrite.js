import { Client, Databases, Account } from 'appwrite';

export const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_PUBLIC_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const account = new Account(client);

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
