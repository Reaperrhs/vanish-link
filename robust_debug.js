process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION');
    console.log(err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('UNHANDLED REJECTION');
    console.log(reason);
    process.exit(1);
});

console.log('Starting backend/index.js...');
require('./backend/index.js');
console.log('index.js required');
