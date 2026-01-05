import axios from 'axios';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/reverse';

// Simple rate limiter queue
let requestQueue: Promise<any> = Promise.resolve();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getAddress = async (lat: number, lng: number): Promise<string> => {
    // Chain requests to respect rate limits (1 per sec roughly)
    const currentRequest = requestQueue.then(async () => {
        await delay(1000); // 1-second delay between requests
        try {
            const response = await axios.get(NOMINATIM_BASE_URL, {
                params: {
                    format: 'json',
                    lat,
                    lon: lng,
                    zoom: 18,
                    addressdetails: 1
                },
                headers: {
                    // Nominatim requires a User-Agent
                    'User-Agent': 'DeliveryRouterApp/1.0'
                }
            });

            if (response.data && response.data.address) {
                const addr = response.data.address;
                // Construct a readable string
                const parts = [];
                if (addr.road) parts.push(addr.road);
                if (addr.house_number) parts.push(addr.house_number);
                if (addr.suburb) parts.push(`(${addr.suburb})`);
                else if (addr.neighbourhood) parts.push(`(${addr.neighbourhood})`);

                return parts.join(' ') || response.data.display_name.split(',')[0];
            }
            return 'Unknown Location';
        } catch (error) {
            console.error('Geocoding error:', error);
            return 'Address lookup failed';
        }
    });

    requestQueue = currentRequest.catch(() => { }); // catch to prevent queue blockage
    return currentRequest;
};
export const searchLocation = async (query: string): Promise<{ lat: number; lng: number; address: string } | null> => {
    const currentRequest = requestQueue.then(async () => {
        await delay(1000);
        try {
            const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    format: 'json',
                    q: query,
                    limit: 1
                },
                headers: {
                    'User-Agent': 'DeliveryRouterApp/1.0'
                }
            });

            if (response.data && response.data.length > 0) {
                const result = response.data[0];
                return {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon),
                    address: result.display_name
                };
            }
            return null;
        } catch (error) {
            console.error('Search error:', error);
            return null;
        }
    });

    requestQueue = currentRequest.catch(() => { });
    return currentRequest;
};
