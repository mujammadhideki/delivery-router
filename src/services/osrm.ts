import axios from 'axios';
import type { LatLngExpression } from 'leaflet';

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving/';

export interface RouteResult {
    distance: number; // meters
    duration: number; // seconds
    geometry: string; // polyline string
    waypoints: any[];
}

export const getRoute = async (points: [number, number][]): Promise<RouteResult | null> => {
    try {
        if (points.length < 2) return null;

        // "lon,lat;lon,lat;..."
        const coordinatesStr = points.map(p => `${p[1]},${p[0]}`).join(';');

        // geometries=polyline&overview=full results in a single geometry for the whole path
        const url = `${OSRM_BASE_URL}${coordinatesStr}?overview=full&geometries=polyline`;

        const response = await axios.get(url);

        if (response.data.code === 'Ok' && response.data.routes.length > 0) {
            const route = response.data.routes[0];
            return {
                distance: route.distance,
                duration: route.duration,
                geometry: route.geometry,
                waypoints: response.data.waypoints
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching route:', error);
        return null;
    }
};

export const decodePolyline = (str: string, precision: number = 5): LatLngExpression[] => {
    let index = 0,
        lat = 0,
        lng = 0,
        coordinates: LatLngExpression[] = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision || 5);

    while (index < str.length) {
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
};
