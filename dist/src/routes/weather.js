import { Router } from 'express';
const router = Router();
const CONDITIONS = ['Sunny', 'Cloudy', 'Partly Cloudy', 'Rainy', 'Thunderstorm', 'Windy', 'Foggy', 'Snowy'];
const CITIES = {
    'Mumbai': { lat: 19.076, lon: 72.877, timezone: 'Asia/Kolkata' },
    'Delhi': { lat: 28.704, lon: 77.102, timezone: 'Asia/Kolkata' },
    'New York': { lat: 40.712, lon: -74.006, timezone: 'America/New_York' },
    'London': { lat: 51.507, lon: -0.127, timezone: 'Europe/London' },
    'Tokyo': { lat: 35.689, lon: 139.691, timezone: 'Asia/Tokyo' },
    'Sydney': { lat: -33.868, lon: 151.207, timezone: 'Australia/Sydney' },
};
function randomBetween(min, max, decimals = 1) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}
// GET /v1/weather?city=Mumbai&units=metric
router.get('/v1/weather', (req, res) => {
    const city = req.query.city || 'Mumbai';
    const units = req.query.units === 'imperial' ? 'imperial' : 'metric';
    const cityInfo = CITIES[city] ?? { lat: randomBetween(-90, 90), lon: randomBetween(-180, 180), timezone: 'UTC' };
    const tempC = randomBetween(5, 42);
    const temp = units === 'imperial' ? parseFloat((tempC * 9 / 5 + 32).toFixed(1)) : tempC;
    const feelsLike = units === 'imperial'
        ? parseFloat(((tempC - 2) * 9 / 5 + 32).toFixed(1))
        : parseFloat((tempC - 2).toFixed(1));
    res.json({
        city,
        coordinates: { lat: cityInfo.lat, lon: cityInfo.lon },
        timezone: cityInfo.timezone,
        current: {
            temperature: temp,
            feelsLike,
            humidity: randomBetween(30, 95, 0),
            windSpeed: randomBetween(0, 80, 1),
            windDirection: randomBetween(0, 360, 0),
            condition: CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)],
            visibility: randomBetween(1, 20, 1),
            uvIndex: randomBetween(0, 11, 0),
            units: units === 'metric' ? { temp: '°C', wind: 'km/h' } : { temp: '°F', wind: 'mph' },
        },
        forecast: Array.from({ length: 5 }, (_, i) => ({
            day: new Date(Date.now() + (i + 1) * 86400000).toLocaleDateString('en-US', { weekday: 'short' }),
            high: units === 'imperial' ? parseFloat(((randomBetween(10, 45)) * 9 / 5 + 32).toFixed(1)) : randomBetween(10, 45),
            low: units === 'imperial' ? parseFloat(((randomBetween(0, 25)) * 9 / 5 + 32).toFixed(1)) : randomBetween(0, 25),
            condition: CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)],
            precipChance: randomBetween(0, 100, 0),
        })),
        source: 'HyperLocal Weather Agent v1 (x402-avm powered)',
        timestamp: new Date().toISOString(),
    });
});
export default router;
