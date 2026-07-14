console.log('Start');
try {
    const appwrite = require('node-appwrite');
    console.log('Appwrite loaded');
} catch (e) {
    console.error('Error loading appwrite:', e);
}
