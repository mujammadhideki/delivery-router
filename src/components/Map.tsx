import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet'
import type { LatLngExpression, LatLng } from 'leaflet'
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useMemo } from 'react';

// Custom Icon Generator
const createCustomIcon = (type: 'start' | 'next' | 'normal', number?: number) => {
    let color = '#F44336'; // Red (Normal)
    if (type === 'start') color = '#4CAF50'; // Green
    if (type === 'next') color = '#FF9800'; // Orange

    const html = `
        <div style="
            background-color: ${color};
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-family: sans-serif;
            font-size: 14px;
        ">
            ${type === 'start' ? 'S' : number}
        </div>
        <div style="
            width: 0; 
            height: 0; 
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 8px solid ${color};
            margin: -2px auto 0;
        "></div>
    `;

    return L.divIcon({
        className: 'custom-pin',
        html: html,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -45]
    });
};

const MapViewUpdater = ({ center }: { center: LatLngExpression | null }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

interface MapProps {
    start: LatLng | null;
    deliveries: { id: string; location: LatLng; address: string; status: 'pending' | 'delivered' }[];
    routePath: LatLngExpression[];
    centerOn: LatLngExpression | null;
    onLocationSelect: (latlng: LatLng) => void;
    onMarkerDragEnd: (id: string, latlng: LatLng) => void;
    onStartDragEnd?: (latlng: LatLng) => void;
    onMarkerClick?: (id: string) => void;
}

const LocationHandler = ({
    onLocationSelect
}: {
    onLocationSelect: (latlng: LatLng) => void
}) => {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng);
        },
    });
    return null;
};

const DraggableMarker = ({ position, icon, children, onDragEnd, onClick }: any) => {
    const markerRef = useRef<L.Marker>(null);
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    onDragEnd(marker.getLatLng());
                }
            },
            click() {
                if (onClick) onClick();
            }
        }),
        [onDragEnd, onClick],
    );

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
            icon={icon}>
            {children}
        </Marker>
    )
}

const MapComponent = ({ start, deliveries, routePath, centerOn, onLocationSelect, onMarkerDragEnd, onStartDragEnd, onMarkerClick }: MapProps) => {
    const defaultPosition: LatLngExpression = [40.7128, -74.0060];

    // Filter only pending for index calculation logic if needed, 
    // but usually we display all. 
    // Let's create visual props based on the full list index? 
    // Actually, visual hierarchy usually implies "Order of visit".
    // So 'next' is the first PENDING delivery.

    const pendingDeliveries = deliveries.filter(d => d.status === 'pending');
    // const completedDeliveries = deliveries.filter(d => d.status === 'delivered');

    return (
        <MapContainer center={defaultPosition} zoom={13} scrollWheelZoom={true} className="leaflet-container" zoomControl={false}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationHandler onLocationSelect={onLocationSelect} />
            <MapViewUpdater center={centerOn} />

            {start && (
                <DraggableMarker
                    position={start}
                    icon={createCustomIcon('start')}
                    onDragEnd={(pos: LatLng) => onStartDragEnd && onStartDragEnd(pos)}
                >
                    <Popup>Punto de Partida (Inicio)<br />Arrastra para ajustar</Popup>
                </DraggableMarker>
            )}

            {deliveries.map((d, _) => {
                // Determine visual status
                let type: 'next' | 'normal' = 'normal';
                let numberDisplay = 0;

                if (d.status === 'pending') {
                    const pendingIdx = pendingDeliveries.findIndex(p => p.id === d.id);
                    if (pendingIdx === 0) type = 'next';
                    numberDisplay = pendingIdx + 1;
                } else {
                    // Completed items
                    return null;
                }

                return (
                    <DraggableMarker
                        key={d.id}
                        position={d.location}
                        icon={createCustomIcon(type, numberDisplay)}
                        onDragEnd={(newPos: LatLng) => onMarkerDragEnd(d.id, newPos)}
                        onClick={() => onMarkerClick && onMarkerClick(d.id)}
                    >
                        <Popup>
                            <strong>Parada #{numberDisplay}</strong><br />
                            {d.address}
                        </Popup>
                    </DraggableMarker>
                );
            })}

            {routePath.length > 0 && (
                <Polyline positions={routePath} color="#2196F3" weight={6} opacity={0.8} />
            )}
        </MapContainer>
    )
}

export default MapComponent
