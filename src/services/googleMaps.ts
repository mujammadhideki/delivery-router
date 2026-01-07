/// <reference types="@types/google.maps" />

export const googleGetRoute = async (points: { lat: number, lng: number }[]): Promise<{ distance: number, duration: number, path: { lat: number, lng: number }[] } | null> => {
    if (typeof google === 'undefined' || points.length < 2) return null;

    const directionsService = new google.maps.DirectionsService();
    const [origin, ...waypoints] = points;
    const destination = waypoints.pop()!;

    const request: google.maps.DirectionsRequest = {
        origin,
        destination,
        waypoints: waypoints.map(p => ({ location: p, stopover: true })),
        travelMode: google.maps.TravelMode.DRIVING,
    };

    return new Promise((resolve) => {
        directionsService.route(request, (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
            if (status === 'OK' && result && result.routes[0]) {
                const route = result.routes[0];
                let dist = 0;
                let dur = 0;
                route.legs.forEach((leg: google.maps.DirectionsLeg) => {
                    dist += leg.distance?.value || 0;
                    dur += leg.duration?.value || 0;
                });
                resolve({
                    distance: dist,
                    duration: dur,
                    path: route.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }))
                });
            } else {
                resolve(null);
            }
        });
    });
};

export const googleGetAddress = async (lat: number, lng: number): Promise<string> => {
    if (typeof google === 'undefined') return 'Cargando...';
    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                resolve(results[0].formatted_address);
            } else {
                resolve('Ubicación desconocida');
            }
        });
    });
};

export const googleSearchLocation = async (query: string): Promise<{ lat: number, lng: number, address: string } | null> => {
    if (typeof google === 'undefined') return null;
    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve) => {
        geocoder.geocode({ address: query }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                resolve({
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng(),
                    address: results[0].formatted_address
                });
            } else {
                resolve(null);
            }
        });
    });
};
