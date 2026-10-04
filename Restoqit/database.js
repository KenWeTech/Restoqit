const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const { promisify } = require('util');
const fs = require('fs');

const dbDirectory = path.join(__dirname, 'data');
const dbPath = path.join(dbDirectory, 'restoqit.db');

if (!fs.existsSync(dbDirectory)) {
    console.log(`Creating database directory: ${dbDirectory}`);
    fs.mkdirSync(dbDirectory, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

db.run = promisify(db.run);
db.get = promisify(db.get);
db.all = promisify(db.all);

async function addColumnIfNotExists(tableName, columnName, columnDef) {
    try {
        await db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
    } catch (err) {
        if (!err.message.includes('duplicate column name')) {
            throw err;
        }
    }
}

async function initializeDB() {
    console.log('Connected to the SQLite database.');

    const userTableSql = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            isAdmin BOOLEAN DEFAULT 0
        );
    `;
    const settingsTableSql = `
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            grocy_url TEXT,
            grocy_api_key TEXT,
            check_interval INTEGER DEFAULT 300,
            default_shopping_list_id INTEGER,
            weather_api_key TEXT,
            weather_location TEXT,
            weather_units TEXT DEFAULT 'metric',
            date_format TEXT DEFAULT 'YYYY-MM-DD',
            time_format TEXT DEFAULT 'HH:mm',
            enable_stock_actions BOOLEAN DEFAULT 0,
            stock_actions_admin_only BOOLEAN DEFAULT 1
        );
    `;

    try {
        await db.run(userTableSql);
        await db.run(settingsTableSql);
        console.log('Tables checked/created successfully.');

        await addColumnIfNotExists('settings', 'weather_units', "TEXT DEFAULT 'metric'");
        await addColumnIfNotExists('settings', 'date_format', "TEXT DEFAULT 'YYYY-MM-DD'");
        await addColumnIfNotExists('settings', 'time_format', "TEXT DEFAULT 'HH:mm'");
        await addColumnIfNotExists('settings', 'enable_stock_actions', "BOOLEAN DEFAULT 0");
        await addColumnIfNotExists('settings', 'stock_actions_admin_only', "BOOLEAN DEFAULT 1");

        const row = await db.get("SELECT COUNT(id) as count FROM settings");
        if (row.count === 0) {
            await db.run("INSERT INTO settings (id) VALUES (1)");
            console.log('Default settings row inserted.');
        }

        await createAdminUser();

    } catch (err) {
        console.error('Error initializing database:', err.message);
        process.exit(1);
    }
}

async function createAdminUser() {
    const adminUsername = 'admin';
    const adminPassword = 'password';
    try {
        const row = await db.get("SELECT * FROM users WHERE username = ?", [adminUsername]);
        if (!row) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            await db.run("INSERT INTO users (username, password, isAdmin) VALUES (?, ?, 1)", [adminUsername, hashedPassword]);
            console.log(`
            ************************************************************
            * Admin user created.
            * Username: ${adminUsername}
            * Password: ${adminPassword}
            * PLEASE LOG IN AND CHANGE THE DEFAULT PASSWORD IMMEDIATELY!
            ************************************************************
            `);
        }
    } catch (err) {
        console.error('Error creating admin user:', err.message);
    }
}

module.exports = { db, initializeDB };
