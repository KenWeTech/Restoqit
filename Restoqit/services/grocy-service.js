const fetch = require('node-fetch');

async function grocyApiRequest(settings, endpoint) {
    if (!settings.grocy_url || !settings.grocy_api_key) {
        throw new Error('Grocy URL or API Key is not configured.');
    }
    const url = `${settings.grocy_url}/api/${endpoint}`;
    const headers = {
        'GROCY-API-KEY': settings.grocy_api_key,
        'Accept': 'application/json'
    };
    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`Grocy API error: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching from Grocy API:', error);
        return null;
    }
}

async function getAllShoppingLists(settings) {
    try {
        const shoppingLists = await grocyApiRequest(settings, 'objects/shopping_lists');
        return shoppingLists;
    } catch (error) {
        console.error('Error fetching shopping lists:', error);
        return [];
    }
}

async function getShoppingListItems(settings, shoppingListId) {
    if (!shoppingListId) return [];
    try {
        const [items, products] = await Promise.all([
            grocyApiRequest(settings, `objects/shopping_list?query[]=shopping_list_id=${shoppingListId}`),
            grocyApiRequest(settings, 'objects/products')
        ]);

        if (!items || !products) return [];

        const productMap = new Map(products.map(p => [p.id, p]));

        return items.map(item => ({
            ...item,
            product_name: productMap.get(item.product_id)?.name || 'Unknown Product'
        }));
    } catch (error) {
        console.error('Error fetching shopping list items:', error);
        return [];
    }
}

async function getVolatileStock(settings) {
    const [stock, products, locations] = await Promise.all([
        grocyApiRequest(settings, 'stock'),
        grocyApiRequest(settings, 'objects/products'),
        grocyApiRequest(settings, 'objects/locations'),
    ]);

    if (!stock || !products || !locations) return null;

    const productMap = new Map(products.map(p => [p.id, p]));
    const locationMap = new Map(locations.map(l => [l.id, l]));

    const stockDetails = stock.map(item => ({
        ...item,
        product_name: productMap.get(item.product_id)?.name || 'Unknown Product',
        location_name: locationMap.get(item.location_id)?.name || 'Unknown Location'
    }));

    const now = new Date();
    const expiringSoonDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    const expired = stockDetails.filter(item => new Date(item.best_before_date) < now);
    const expiring = stockDetails.filter(item => new Date(item.best_before_date) >= now && new Date(item.best_before_date) <= expiringSoonDate);
    const lowStock = stockDetails.filter(item => parseInt(item.amount, 10) < parseInt(productMap.get(item.product_id)?.min_stock_amount || 0, 10));

    return { expired, expiring, lowStock };
}

async function getWeatherData(apiKey, location, units) {
    if (!apiKey || !location) return null;
    const encodedLocation = encodeURIComponent(location);
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodedLocation}&appid=${apiKey}&units=${units}`;

    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            return {
                temp: data.main.temp,
                description: data.weather[0].description,
                icon: `http://openweathermap.org/img/wn/${data.weather[0].icon}.png`
            };
        }
    } catch (error) {
        console.error("Could not fetch current weather data, attempting fallback:", error.message);
    }

    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodedLocation}&appid=${apiKey}&units=${units}`;
    try {
        const response = await fetch(forecastUrl);
        if (response.ok) {
            const data = await response.json();

            if (data.list && data.list.length > 0) {
                const forecast = data.list[0];
                return {
                    temp: forecast.main.temp,
                    description: forecast.weather[0].description,
                    icon: `http://openweathermap.org/img/wn/${forecast.weather[0].icon}.png`
                };
            }
        }
    } catch (error) {
        console.error("Could not fetch forecast weather data either:", error.message);
    }

    return null;
}

module.exports = { getVolatileStock, getWeatherData, getAllShoppingLists, getShoppingListItems };