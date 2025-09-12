const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../database.js');
const { getVolatileStock, getWeatherData, getAllShoppingLists, getShoppingListItems } = require('../services/grocy-service.js');

function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
}

function handleFlashMessages(req, res, next) {
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
}

async function getGrocySettings(req, res, next) {
    try {
        const settings = await db.get("SELECT * FROM settings WHERE id = 1");
        if (!settings || !settings.grocy_url || !settings.grocy_api_key) {
            if (req.path !== '/settings') {
                req.session.message = { type: 'error', text: 'Please configure your Grocy server URL and API key.' };
                return res.redirect('/settings');
            }
        }
        res.locals.settings = settings || {};
        res.locals.checkInterval = (settings && settings.check_interval) ? settings.check_interval * 1000 : 300000;
        next();
    } catch (err) {
        console.error('Error fetching settings in middleware:', err.message);
        req.session.message = { type: 'error', text: 'Failed to load settings.' };
        return res.redirect('/settings');
    }
}

router.use(handleFlashMessages);

router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
        if (!user) {
            return res.render('login', { error: 'Invalid username or password.' });
        }
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.userId = user.id;
            req.session.username = user.username;
            res.redirect('/');
        } else {
            res.render('login', { error: 'Invalid username or password.' });
        }
    } catch (err) {
        console.error('Login error:', err.message);
        res.render('login', { error: 'An error occurred during login. Please try again.' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        res.redirect('/login');
    });
});

async function renderGrocyPage(req, res, view, pageData = {}) {
    try {
        const data = await getVolatileStock(res.locals.settings);
        if (!data) {
            req.session.message = { type: 'error', text: 'Could not connect to Grocy. Please check your URL and API key in settings.' };
            return res.redirect('/settings');
        }
        res.render(view, { ...data, ...pageData });
    } catch (error) {
        console.error("Error in renderGrocyPage:", error);
        req.session.message = { type: 'error', text: 'An unexpected error occurred while fetching Grocy data.' };
        res.redirect('/settings');
    }
}

router.get('/', isAuthenticated, getGrocySettings, async (req, res) => {
    const settings = res.locals.settings;
    const defaultShoppingListId = settings.default_shopping_list_id || 1;

    if (!settings.grocy_url || !settings.grocy_api_key) {
        req.session.message = { type: 'error', text: 'Please configure your Grocy server URL and API key in settings.' };
        return res.redirect('/settings');
    }

    try {
        const [dashboardData, groceryList, weather] = await Promise.all([
            getVolatileStock(settings),
            getShoppingListItems(settings, defaultShoppingListId),
            getWeatherData(settings.weather_api_key, settings.weather_location, settings.weather_units)
        ]);

        if (!dashboardData) {
            req.session.message = { type: 'error', text: 'Could not connect to Grocy. The overview content will not be displayed.' };
            return res.render('overview', {
                expired: [],
                expiring: [],
                lowStock: [],
                groceryList: [],
                weather,
                pageTitle: 'Overview'
            });
        }

        res.render('overview', {
            ...dashboardData,
            groceryList,
            weather,
            pageTitle: 'Overview'
        });
    } catch (error) {
        console.error("Error on overview route:", error);
        req.session.message = { type: 'error', text: 'An unexpected error occurred.' };
        res.redirect('/settings');
    }
});

router.get('/expiring', isAuthenticated, getGrocySettings, (req, res) => {
    renderGrocyPage(req, res, 'expiring');
});

router.get('/expired', isAuthenticated, getGrocySettings, (req, res) => {
    renderGrocyPage(req, res, 'expired');
});

router.get('/low-stock', isAuthenticated, getGrocySettings, (req, res) => {
    renderGrocyPage(req, res, 'low-stock');
});

router.get('/grocery-list', isAuthenticated, getGrocySettings, async (req, res) => {
    const settings = res.locals.settings;
    try {
        const allLists = await getAllShoppingLists(settings);
        res.render('grocery-list', {
            shoppingLists: allLists,
            pageTitle: 'Grocery Lists'
        });
    } catch (error) {
        req.session.message = { type: 'error', text: 'Error fetching grocery lists.' };
        res.redirect('/');
    }
});

router.get('/api/grocery-list-items', isAuthenticated, getGrocySettings, async (req, res) => {
    const settings = res.locals.settings;
    const listId = req.query.list_id;
    try {
        const groceryList = await getShoppingListItems(settings, listId);
        res.json({ groceryList });
    } catch (error) {
        console.error('API Error fetching grocery list items:', error);
        res.status(500).json({ error: 'Failed to fetch list items' });
    }
});

router.get('/settings', isAuthenticated, getGrocySettings, async (req, res) => {
    try {
        const settings = await db.get("SELECT * FROM settings WHERE id = 1");

        const users = await db.all("SELECT id, username, isAdmin FROM users");

        const shoppingLists = await getAllShoppingLists(settings);

        res.render('settings', {
            settings: settings || {},
            users: users || [],
            currentUser: { id: req.session.userId, username: req.session.username },
            shoppingLists: shoppingLists || []
        });

    } catch (error) {
        console.error('Error on settings route:', error);
        res.render('settings', {
            settings: {},
            users: [],
            currentUser: { id: req.session.userId, username: req.session.username },
            shoppingLists: []
        });
    }
});

router.post('/settings/grocy', isAuthenticated, async (req, res) => {
    const { grocy_url, grocy_api_key, check_interval, default_shopping_list_id } = req.body;
    try {
        await db.run(
            `UPDATE settings SET grocy_url = ?, grocy_api_key = ?, check_interval = ?, default_shopping_list_id = ? WHERE id = 1`,
            [
                (grocy_url || '').trim().replace(/\/$/, ""),
                (grocy_api_key || '').trim(),
                check_interval,
                default_shopping_list_id
            ]
        );
        req.session.message = { type: 'success', text: 'Grocy settings saved successfully!' };
    } catch (err) {
        console.error('Grocy settings save error:', err.message);
        req.session.message = { type: 'error', text: 'Failed to save Grocy settings.' };
    } finally {
        res.redirect('/settings');
    }
});

router.post('/settings/weather', isAuthenticated, async (req, res) => {
    const { weather_api_key, weather_location, weather_units, date_format, time_format } = req.body;

    try {
        await db.run(
            `UPDATE settings SET weather_api_key = ?, weather_location = ?, weather_units = ?, date_format = ?, time_format = ? WHERE id = 1`,
            [
                (weather_api_key || '').trim(),
                (weather_location || '').trim(),
                weather_units,
                date_format,
                time_format
            ]
        );
        req.session.message = { type: 'success', text: 'Weather settings saved successfully!' };
    } catch (err) {
        req.session.message = { type: 'error', text: 'Failed to save Weather settings.' };
        console.error('Database update failed:', err.message);
    } finally {
        res.redirect('/settings');
    }
});

router.post('/settings/user/add', isAuthenticated, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        req.session.message = { type: 'error', text: 'Username and password cannot be empty.' };
        return res.redirect('/settings');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await db.run(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            [username, hashedPassword]
        );
        req.session.message = { type: 'success', text: `User '${username}' created successfully!` };
    } catch (err) {
        req.session.message = { type: 'error', text: 'Username already exists.' };
    } finally {
        res.redirect('/settings');
    }
});

router.post('/settings/user/delete/:id', isAuthenticated, async (req, res) => {
    const userIdToDelete = parseInt(req.params.id, 10);

    if (userIdToDelete === req.session.userId) {
        req.session.message = { type: 'error', text: 'You cannot delete yourself.' };
        return res.redirect('/settings');
    }

    try {
        const adminCountRow = await db.get("SELECT COUNT(*) as adminCount FROM users WHERE isAdmin = 1");
        const userToDelete = await db.get("SELECT * FROM users WHERE id = ?", [userIdToDelete]);

        if (userToDelete && userToDelete.isAdmin && adminCountRow.adminCount <= 1) {
            req.session.message = { type: 'error', text: 'Cannot delete the last admin user.' };
            return res.redirect('/settings');
        }

        const result = await db.run("DELETE FROM users WHERE id = ?", [userIdToDelete]);
        if (result.changes === 0) {
            req.session.message = { type: 'error', text: 'User not found.' };
        } else {
            req.session.message = { type: 'success', text: 'User deleted successfully.' };
        }
    } catch (err) {
        req.session.message = { type: 'error', text: 'Error deleting user.' };
    } finally {
        res.redirect('/settings');
    }
});

router.post('/settings/user/change-password', isAuthenticated, async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;

    if (new_password !== confirm_password) {
        req.session.message = { type: 'error', text: 'New passwords do not match.' };
        return res.redirect('/settings');
    }

    try {
        const user = await db.get("SELECT * FROM users WHERE id = ?", [req.session.userId]);
        const match = await bcrypt.compare(current_password, user.password);

        if (!match) {
            req.session.message = { type: 'error', text: 'Incorrect current password.' };
            return res.redirect('/settings');
        }

        const hashedNewPassword = await bcrypt.hash(new_password, 10);
        await db.run("UPDATE users SET password = ? WHERE id = ?", [hashedNewPassword, req.session.userId]);
        req.session.message = { type: 'success', text: 'Password changed successfully!' };
    } catch (err) {
        console.error('Password change error:', err.message);
        req.session.message = { type: 'error', text: 'An error occurred. Please try again.' };
    } finally {
        res.redirect('/settings');
    }
});

module.exports = router;

