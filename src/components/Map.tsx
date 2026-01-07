import { Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useCallback } from 'react';

export interface Point {
    lat: number;
    lng: number;
}

interface MapProps {
    start: Point | null;
    deliveries: { id: string; location: Point; address: string; status: 'pending' | 'delivered' }[];
    routePath: Point[];
    centerOn: Point | null;
    onLocationSelect: (latlng: Point) => void;
    onMarkerDragEnd: (id: string, latlng: Point) => void;
    onStartDragEnd?: (latlng: Point) => void;
    onMarkerClick?: (id: string) => void;
}

const DraggableMarker = ({ position, title, color, label, onDragEnd, onClick }: {
    position: Point,
    title?: string,
    color?: string,
    label?: string,
    onDragEnd: (pos: Point) => void,
    onClick?: () => void
}) => {
    return (
        <AdvancedMarker
            position={position}
            draggable={true}
            onDragEnd={(e) => {
                if (e.latLng) {
                    onDragEnd({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                }
            }}
            onClick={onClick}
            title={title}
        >
            <Pin background={color || '#F44336'} glyph={label} borderColor={'#fff'} />
        </AdvancedMarker>
    );
};

// Component to handle route path drawing since react-google-maps doesn't have a direct Polyline component yet
const Polyline = ({ path }: { path: Point[] }) => {
    const map = useMap();

    useEffect(() => {
        if (!map || path.length === 0) return;

        const polyline = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#2196F3',
            strokeOpacity: 0.8,
            strokeWeight: 6,
            map: map
        });

        return () => {
            polyline.setMap(null);
        };
    }, [map, path]);

    return null;
};

const MapComponent = ({ start, deliveries, routePath, centerOn, onLocationSelect, onMarkerDragEnd, onStartDragEnd, onMarkerClick }: MapProps) => {
    const defaultPosition = { lat: 10.4806, lng: -66.8983 }; // Caracas

    const handleMapClick = useCallback((e: any) => {
        if (e.detail.latLng) {
            onLocationSelect(e.detail.latLng);
        }
    }, [onLocationSelect]);

    return (
        <Map
            style={{ width: '100%', height: '100%' }}
            defaultCenter={defaultPosition}
            defaultZoom={13}
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            onClick={handleMapClick}
            center={centerOn}
            mapId={'DEMO_MAP_ID'} // Advanced markers require a mapId
        >
            {start && (
                <DraggableMarker
                    position={start}
                    label={'S'}
                    color={'#4CAF50'}
                    title={'Punto de Partida'}
                    onDragEnd={(pos) => onStartDragEnd && onStartDragEnd(pos)}
                />
            )}

            {deliveries.map((d) => {
                if (d.status === 'delivered') return null;
                const pendingIdx = deliveries.filter(del => del.status === 'pending').findIndex(p => p.id === d.id);

                return (
                    <DraggableMarker
                        key={d.id}
                        position={d.location}
                        label={(pendingIdx + 1).toString()}
                        color={pendingIdx === 0 ? '#FF9800' : '#F44336'}
                        title={`Parada #${pendingIdx + 1}`}
                        onDragEnd={(newPos) => onMarkerDragEnd(d.id, newPos)}
                        onClick={() => onMarkerClick && onMarkerClick(d.id)}
                    />
                );
            })}

            <Polyline path={routePath} />
        </Map>
    );
};

export default MapComponent;
