console.log('Testing dependencies...');
const express = require('express');
console.log('Express loaded');
const cors = require('cors');
console.log('Cors loaded');
const dotenv = require('dotenv');
console.log('Dotenv loaded');
const { Client, Databases, Query, ID } = require('node-appwrite');
console.log('Node-Appwrite loaded');

dotenv.config();
console.log('Dotenv config done');

const app = express();
console.log('App created');
const PORT = process.env.PORT || 3000;
console.log('Port:', PORT);

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
console.log('Appwrite client configured');
