const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const bonjour = require('bonjour')();
const { initializeDB } = require('./database.js'); 

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8686;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.set('trust proxy', 1);

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'a_very_secret_key_for_restoqit',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.SECURE_COOKIE === 'true' } 

}));

app.get('/offline.html', (req, res) => {
    res.render('offline');
});

let serverInstance;

async function startServer() {
    try {

        await initializeDB();

        const routes = require('./routes/index.js');
        app.use('/', routes);

        serverInstance = http.createServer(app).listen(PORT, () => {
            console.log(`HTTP server running on port ${PORT}`);
            if (process.send) {
                process.send('server-ready');
            }
            try {
                const service = bonjour.publish({
                    name: 'Restoqit Web Server',
                    type: 'http',
                    port: PORT,
                    protocol: 'tcp',
                    host: 'restoqit.local'
                });
                service.on('up', () => {
                    console.log(`[mDNS] HTTP service 'Restoqit Web Server' is up and discoverable at http://restoqit.local:${PORT}`);
                });
                service.on('error', (err) => {
                    console.error(`[mDNS Error] Failed to publish HTTP service: ${err.message}`);
                });
            } catch (e) {
                console.error(`[mDNS Error] Exception while trying to publish HTTP service: ${e.message}`);
            }
        });
    } catch (error) {
        console.error('Failed to start the server due to a database error:', error);
        process.exit(1);
    }
}

startServer();

process.on('SIGTERM', () => {
    console.log('[Server Shutdown] Stopping mDNS service...');
    bonjour.unpublishAll();
    bonjour.destroy();
    serverInstance.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('[Server Shutdown] Stopping mDNS service...');
    bonjour.unpublishAll();
    bonjour.destroy();
    serverInstance.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

