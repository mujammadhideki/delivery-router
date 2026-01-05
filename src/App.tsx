import { useState, useRef, useEffect } from 'react';
import MapComponent from './components/Map'
import { getRoute, decodePolyline } from './services/osrm';
import { getAddress } from './services/geocoding';
import type { LatLng, LatLngExpression } from 'leaflet';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CompletedItem } from './components/CompletedItem';
import { SortableItem } from './components/SortableItem';

import './index.css'

export interface Delivery {
  id: string;
  location: LatLng;
  address: string;
  customer: {
    name: string;
    phone: string;
  };
  order: {
    items: string;
    isPaid: boolean;
    amount: number;
    deliveryFee: number;
    paymentDetails?: string;
  };
  status: 'pending' | 'delivered';
}

interface PricingRule {
  maxKm: number;
  price: number;
}

function App() {
  const [start, setStart] = useState<LatLng | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [routePath, setRoutePath] = useState<LatLngExpression[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<LatLngExpression | null>(null);

  // Mobile & Toggle State
  const [showPanel, setShowPanel] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showCoordInput, setShowCoordInput] = useState(false);
  const [coordInputText, setCoordInputText] = useState('');

  // Pricing Rules State
  const [showSettings, setShowSettings] = useState(false);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([
    { maxKm: 3, price: 1 },
    { maxKm: 6, price: 2 },
    { maxKm: 10, price: 4 },
    { maxKm: 9999, price: 6 } // Fallback
  ]);

  // Auto-Geolocation on startup
  useEffect(() => {
    handleLocateMe();

    // Mobile detection listener
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setShowPanel(true); // Always show on desktop
    };

    window.addEventListener('resize', handleResize);
    // Initial check logic
    if (window.innerWidth < 768) setShowPanel(false); // Start map-only on mobile

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortDeliveriesRef = (pickup: LatLng, points: Delivery[]): Delivery[] => {
    const pending = points.filter(d => d.status === 'pending');
    const completed = points.filter(d => d.status === 'delivered');

    if (pending.length === 0) return completed;

    const remaining = [...pending];
    const sortedPending: Delivery[] = [];
    let current = pickup;

    while (remaining.length > 0) {
      let nearestIdx = -1;
      let minDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const d = current.distanceTo(remaining[i].location);
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }

      if (nearestIdx !== -1) {
        const nextDelivery = remaining.splice(nearestIdx, 1)[0];
        sortedPending.push(nextDelivery);
        current = nextDelivery.location;
      }
    }
    return [...sortedPending, ...completed];
  };

  const calculateRoute = async (pickup: LatLng, allDeliveries: Delivery[]) => {
    const pending = allDeliveries.filter(d => d.status === 'pending');

    if (!pickup || pending.length === 0) {
      setRoutePath([]);
      setRouteInfo(null);
      return;
    }

    setLoading(true);
    const points: [number, number][] = [
      [pickup.lat, pickup.lng],
      ...pending.map(d => [d.location.lat, d.location.lng] as [number, number])
    ];

    const result = await getRoute(points);
    setLoading(false);

    if (result) {
      setRouteInfo({ distance: result.distance, duration: result.duration });
      const decoded = decodePolyline(result.geometry);
      setRoutePath(decoded);
    }
  };

  const handleLocationSelect = async (latlng: LatLng) => {
    if (!start) {
      setStart(latlng);
      setDeliveries([]);
      setRoutePath([]);
      setRouteInfo(null);
    } else {
      const tempAddress = `Cargando dirección...`;

      // Calculate initial delivery fee
      let fee = 0;
      if (start) {
        const distKm = start.distanceTo(latlng) / 1000;
        const rule = pricingRules.find(r => distKm <= r.maxKm);
        fee = rule ? rule.price : pricingRules[pricingRules.length - 1].price;
      }

      const newDelivery: Delivery = {
        id: crypto.randomUUID(),
        location: latlng,
        address: tempAddress,
        customer: { name: '', phone: '' },
        order: { items: '', isPaid: false, amount: 0, deliveryFee: fee },
        status: 'pending'
      };

      // APPEND only, DO NOT SORT automatically
      const currentList = [...deliveries, newDelivery];
      setDeliveries(currentList);

      getAddress(latlng.lat, latlng.lng).then(address => {
        handleUpdateDelivery(newDelivery.id, { address });
      });

      await calculateRoute(start, currentList);
    }
  };

  const handleUpdateDelivery = (id: string, updates: Partial<Delivery> | { customer?: Partial<Delivery['customer']>, order?: Partial<Delivery['order']> }) => {
    setDeliveries(prev => prev.map(d => {
      if (d.id !== id) return d;

      const updated = { ...d };
      if ('address' in updates) updated.address = updates.address!;
      if ('status' in updates) updated.status = updates.status!;

      if ('customer' in updates) {
        updated.customer = { ...d.customer, ...updates.customer };
      }
      if ('order' in updates) {
        updated.order = { ...d.order, ...updates.order };
      }
      return updated;
    }));
  };

  const markAsDelivered = async (id: string) => {
    const updatedList = deliveries.map(d => d.id === id ? { ...d, status: 'delivered' as const } : d);
    setDeliveries(updatedList);
    if (start) {
      await calculateRoute(start, updatedList);
    }
  };

  const markAsPending = async (id: string) => {
    const updatedList = deliveries.map(d => d.id === id ? { ...d, status: 'pending' as const } : d);
    setDeliveries(updatedList);
    if (start) {
      await calculateRoute(start, updatedList);
    }
  };


  const handleReset = () => {
    setStart(null);
    setDeliveries([]);
    setRoutePath([]);
    setRouteInfo(null);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const formatDistance = (meters: number) => {
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const handleStartDrag = async (newLatLng: LatLng) => {
    setStart(newLatLng);
    if (deliveries.length > 0) {
      await calculateRoute(newLatLng, deliveries);
    }
  };

  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      alert("Geolocalización no soportada en este navegador.");
      return;
    }

    const onSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      const latlng = { lat: latitude, lng: longitude } as LatLng;
      setMapCenter([latitude, longitude]);
      setStart(latlng);
    };

    const onError = (err: GeolocationPositionError) => {
      // If High Accuracy fails (timeout or other), try Low Accuracy
      console.warn("High accuracy failed, trying low accuracy...", err.message);
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        (finalErr) => {
          alert(`No pudimos ubicarte automáticamente (Error: ${finalErr.message}).\n\nPor favor, usa el mapa para arrastrar el punto de inicio 'S' a tu ubicación.`);
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 0 }
      );
    };

    // First try High Accuracy with a reasonable timeout
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      onError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCoordinateSubmit = async () => {
    const input = coordInputText.trim();
    if (!input) return;

    // Helper to validate ranges
    const isValid = (lat: number, lng: number) =>
      !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

    let lat: number | null = null;
    let lng: number | null = null;

    // 1. Try Direct Coordinates (e.g. "10.123, -66.123")
    const simpleMatch = input.match(/([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)/);
    if (simpleMatch) {
      lat = parseFloat(simpleMatch[1]);
      lng = parseFloat(simpleMatch[2]);
    }
    // 2. Try Long Google Maps URL
    else if (input.includes('google.com/maps')) {
      const atMatch = input.match(/@([-+]?\d+\.\d+),([-+]?\d+\.\d+)/);
      const qMatch = input.match(/[?&]q=([-+]?\d+\.\d+),([-+]?\d+\.\d+)/);
      const llMatch = input.match(/[?&]ll=([-+]?\d+\.\d+),([-+]?\d+\.\d+)/); // strict parameter

      if (atMatch) { lat = parseFloat(atMatch[1]); lng = parseFloat(atMatch[2]); }
      else if (qMatch) { lat = parseFloat(qMatch[1]); lng = parseFloat(qMatch[2]); }
      else if (llMatch) { lat = parseFloat(llMatch[1]); lng = parseFloat(llMatch[2]); }
    }
    // 3. Try Short/Share URL (maps.app.goo.gl)
    else if (input.includes('goo.gl') || input.includes('maps.app.goo.gl')) {
      setCoordInputText('Procesando enlace...'); // Loading feedback
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(input)}`;
        const res = await fetch(proxyUrl);
        const data = await res.json();
        const html = data.contents || '';
        const resolvedUrl = data.status?.url || '';

        // Helper to find coords in text
        const findCoords = (text: string) => {
          const decoded = decodeURIComponent(text);
          const atMatch = decoded.match(/@([-+]?\d+\.\d+),([-+]?\d+\.\d+)/);
          const qMatch = decoded.match(/[?&]q=([-+]?\d+\.\d+)[\s,]+([-+]?\d+\.\d+)/);
          const llMatch = decoded.match(/[?&]ll=([-+]?\d+\.\d+)[\s,]+([-+]?\d+\.\d+)/);
          const centerMatch = decoded.match(/center=([-+]?\d+\.\d+)[\s,]+([-+]?\d+\.\d+)/);

          if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
          if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
          if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
          if (centerMatch) return { lat: parseFloat(centerMatch[1]), lng: parseFloat(centerMatch[2]) };
          return null;
        };

        let coords = findCoords(resolvedUrl);
        if (!coords) coords = findCoords(html);

        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        } else {
          // Special deep check for specific Google Maps pattern seen in debug
          const deepMatch = html.match(/q=([-+]?\d+\.\d+)%2C\+([-+]?\d+\.\d+)/);
          if (deepMatch) {
            lat = parseFloat(deepMatch[1]);
            lng = parseFloat(deepMatch[2]);
          }
        }

        if (lat === null || lng === null) {
          alert('No se pudieron extraer coordenadas. Intenta usar el enlace largo de Google Maps.');
          setCoordInputText(input);
          return;
        }
      } catch (e) {
        console.error(e);
        alert('Error al procesar el enlace. Verifica tu conexión.');
        setCoordInputText(input);
        return;
      }
    }

    if (lat !== null && lng !== null && isValid(lat, lng)) {
      handleLocationSelect({ lat, lng } as LatLng);
      setShowCoordInput(false);
      setCoordInputText('');
    } else {
      alert('Formato no reconocido. Intenta: "Lat, Lng" o un enlace válido de Google Maps.');
      // If we failed during "Processing...", verify if we should clear or restore
      if (coordInputText === 'Procesando enlace...') setCoordInputText('');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    // ... existing drag end code ...
    const { active, over } = event;

    if (active.id !== over?.id) {
      setDeliveries((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);

        const newOrder = arrayMove(items, oldIndex, newIndex);

        if (start) {
          calculateRoute(start, newOrder);
        }
        return newOrder;
      });
    }
  };

  const handleManualOptimize = async () => {
    if (start && deliveries.length > 0) {
      const optimized = sortDeliveriesRef(start, deliveries);
      setDeliveries(optimized);
      await calculateRoute(start, optimized);
    }
  }

  const handleDeleteDelivery = async (id: string) => {
    const updatedList = deliveries.filter(d => d.id !== id);
    setDeliveries(updatedList);
    if (start) {
      await calculateRoute(start, updatedList);
    }
  };

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleMarkerClick = (id: string) => {
    // Mobile Experience: If map is clicked, user might want to edit details. 
    // We should SHOW the panel if logic dictates.
    if (isMobile) setShowPanel(true);

    setHighlightedId(id);
    const el = itemRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Remove highlight after 2 seconds
    setTimeout(() => setHighlightedId(null), 2000);
  };

  const handleMarkerDrag = async (id: string, newLatLng: LatLng) => {
    // Update location in state
    const updatedList = deliveries.map(d => {
      if (d.id === id) {
        return { ...d, location: newLatLng, address: 'Actualizando...' };
      }
      return d;
    });
    setDeliveries(updatedList);

    // Fetch new address
    getAddress(newLatLng.lat, newLatLng.lng).then(address => {
      handleUpdateDelivery(id, { address });
    });

    // Recalculate route
    if (start) {
      await calculateRoute(start, updatedList);
    }
  };

  const pendingDeliveries = deliveries.filter(d => d.status === 'pending');
  const completedDeliveries = deliveries.filter(d => d.status === 'delivered');

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem', background: '#333', color: 'white', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Ruta de Entrega</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Toggle Button for Mobile */}
          {isMobile && (
            <button
              onClick={() => setShowPanel(!showPanel)}
              style={{
                background: showPanel ? '#fff' : '#2196F3',
                color: showPanel ? '#333' : '#fff',
                border: 'none',
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}
            >
              {showPanel ? 'Ver Mapa' : 'Ver Lista'}
            </button>
          )}
          <button onClick={handleLocateMe} style={{ background: '#2196F3', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Ubicarme</button>
          <button onClick={() => setShowCoordInput(true)} style={{ background: '#9C27B0', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>+ Coord</button>
          <button onClick={handleManualOptimize} style={{ background: '#FF9800', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Optimizar</button>
          <button onClick={handleReset} style={{ background: '#ff4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>Reiniciar</button>
          <button onClick={() => setShowSettings(true)} style={{ background: '#607D8B', color: 'white', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }} title="Configurar Precios">⚙️</button>
        </div>
      </header>

      <div style={{ flex: 1, position: 'relative', display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <MapComponent
            start={start}
            deliveries={deliveries.map(d => ({ id: d.id, location: d.location, address: d.address, status: d.status }))}
            routePath={routePath}
            centerOn={mapCenter}
            onLocationSelect={handleLocationSelect}
            onMarkerDragEnd={handleMarkerDrag}
            onStartDragEnd={handleStartDrag}
            onMarkerClick={handleMarkerClick}
          />
          {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '1rem', borderRadius: '8px', zIndex: 2000 }}>Calculando Ruta...</div>}
          {!start && !loading && <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(76, 175, 80, 0.95)', padding: '0.8rem 1.5rem', borderRadius: '30px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', zIndex: 1000, pointerEvents: 'none', color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>Toca para fijar Punto de Partida</div>}
          {start && !loading && <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(33, 150, 243, 0.95)', padding: '0.8rem 1.5rem', borderRadius: '30px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', zIndex: 1000, pointerEvents: 'none', color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>Toca para agregar Entrega</div>}
        </div>

        <div
          style={{
            width: isMobile ? '100%' : '400px',
            maxWidth: isMobile ? '100%' : '400px',
            position: isMobile ? 'absolute' : 'relative',
            top: 0,
            left: 0,
            height: '100%',
            background: 'white',
            color: '#333',
            borderLeft: '1px solid #ddd',
            overflowY: 'auto',
            display: showPanel ? 'flex' : 'none',
            flexDirection: 'column',
            boxShadow: '-2px 0 5px rgba(0,0,0,0.05)',
            zIndex: 1500, // Above Map controls
            flexShrink: 0
          }}
        >
          <div style={{ padding: '1rem', borderBottom: '1px solid #eee', background: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', color: '#333' }}>Detalles de la Ruta</h2>
          </div>

          <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {routeInfo && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                <div><div style={{ fontSize: '0.75rem', color: '#666' }}>Distancia Total</div><div style={{ fontWeight: 'bold' }}>{formatDistance(routeInfo.distance)}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#666' }}>Tiempo Est.</div><div style={{ fontWeight: 'bold' }}>{formatDuration(routeInfo.duration)}</div></div>
              </div>
            )}

            <h3 style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#2196F3' }}>Pendientes ({pendingDeliveries.length})</h3>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pendingDeliveries.map(d => d.id)}
                strategy={verticalListSortingStrategy}
              >
                {pendingDeliveries.map((delivery, idx) => (
                  <SortableItem key={delivery.id} id={delivery.id}>
                    <div
                      ref={(el) => { itemRefs.current[delivery.id] = el; }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: highlightedId === delivery.id ? '#fff9c4' : 'transparent',
                        transition: 'background 0.3s ease',
                        borderRadius: '4px'
                      }}
                    > {/* Wrapper for padding inside sortable block */}
                      <div style={{ fontWeight: 'bold', color: '#555', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>Parada {idx + 1}</span>
                          <span style={{ fontSize: '0.7rem', background: '#e3f2fd', color: '#1976D2', padding: '2px 6px', borderRadius: '4px' }}>Pendiente</span>
                        </div>
                        <button
                          onClick={() => handleDeleteDelivery(delivery.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ff4444',
                            cursor: 'pointer',
                            padding: '4px',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1
                          }}
                          title="Eliminar entrega"
                        >
                          ×
                        </button>
                      </div>
                      <input type="text" placeholder="Dirección" value={delivery.address} onChange={(e) => handleUpdateDelivery(delivery.id, { address: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box', marginBottom: '8px' }} />

                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <input type="text" placeholder="Nombre" value={delivery.customer.name} onChange={(e) => handleUpdateDelivery(delivery.id, { customer: { name: e.target.value } })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <input type="text" placeholder="Teléfono" value={delivery.customer.phone} onChange={(e) => handleUpdateDelivery(delivery.id, { customer: { phone: e.target.value } })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                      <textarea placeholder="Detalles del Pedido" value={delivery.order.items} onChange={(e) => handleUpdateDelivery(delivery.id, { order: { items: e.target.value } })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', resize: 'vertical', minHeight: '60px', marginBottom: '8px', boxSizing: 'border-box' }} />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <label style={{ fontSize: '0.7rem', color: '#666', marginLeft: '2px' }}>Pedido</label>
                            <span style={{ position: 'absolute', left: '8px', top: '26px', color: '#666' }}>$</span>
                            <input type="number" placeholder="0.00" value={delivery.order.amount || ''} onChange={(e) => handleUpdateDelivery(delivery.id, { order: { amount: parseFloat(e.target.value) } })} style={{ padding: '8px 8px 8px 20px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }} />
                          </div>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <label style={{ fontSize: '0.7rem', color: '#666', marginLeft: '2px' }}>
                              Delivery {start ? `(${(start.distanceTo(delivery.location) / 1000).toFixed(1)}km)` : ''}
                            </label>
                            <span style={{ position: 'absolute', left: '8px', top: '26px', color: '#666' }}>$</span>
                            <input type="number" placeholder="0.00" value={delivery.order.deliveryFee || ''} onChange={(e) => handleUpdateDelivery(delivery.id, { order: { deliveryFee: parseFloat(e.target.value) } })} style={{ padding: '8px 8px 8px 20px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                          <span style={{ fontWeight: 'bold', color: '#333' }}>Total: ${((delivery.order.amount || 0) + (delivery.order.deliveryFee || 0)).toFixed(2)}</span>
                          <div style={{ display: 'flex', gap: '4px', background: '#eee', padding: '2px', borderRadius: '4px' }}>
                            <button
                              onClick={() => handleUpdateDelivery(delivery.id, { order: { isPaid: false } })}
                              style={{ border: 'none', borderRadius: '3px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', background: !delivery.order.isPaid ? '#ffebee' : 'transparent', color: !delivery.order.isPaid ? '#c62828' : '#757575', fontWeight: !delivery.order.isPaid ? 'bold' : 'normal' }}>
                              Por Pagar
                            </button>
                            <button
                              onClick={() => handleUpdateDelivery(delivery.id, { order: { isPaid: true } })}
                              style={{ border: 'none', borderRadius: '3px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', background: delivery.order.isPaid ? '#e8f5e9' : 'transparent', color: delivery.order.isPaid ? '#2e7d32' : '#757575', fontWeight: delivery.order.isPaid ? 'bold' : 'normal' }}>
                              Pagado
                            </button>
                          </div>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Detalles del pago (ej. Pago Móvil, Efvo...)"
                        value={delivery.order.paymentDetails || ''}
                        onChange={(e) => handleUpdateDelivery(delivery.id, { order: { paymentDetails: e.target.value } })}
                        style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box', marginBottom: '8px', fontSize: '0.9rem', background: '#fafafa' }}
                      />

                      <button
                        onClick={() => markAsDelivered(delivery.id)}
                        style={{ width: '100%', marginTop: '10px', padding: '10px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Marcar Entregado
                      </button>
                    </div>
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>



            {completedDeliveries.length > 0 && (
              <>
                <h3 style={{ margin: '15px 0 5px 0', fontSize: '0.9rem', color: '#4CAF50' }}>Completados ({completedDeliveries.length})</h3>
                {completedDeliveries.map((delivery) => (
                  <CompletedItem
                    key={delivery.id}
                    delivery={delivery}
                    onDelete={handleDeleteDelivery}
                    onUndo={markAsPending}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal coords input */}
      {showCoordInput && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 3000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', minWidth: '300px' }}>
            <h3 style={{ marginTop: 0 }}>Agregar Ubicación</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>Coordenadas o Enlace de Google Maps</p>
            <input
              autoFocus
              type="text"
              value={coordInputText}
              onChange={(e) => setCoordInputText(e.target.value)}
              placeholder="10.49, -66.89"
              style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', marginBottom: '1rem', boxSizing: 'border-box' }}
              onKeyDown={(e) => e.key === 'Enter' && handleCoordinateSubmit()}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCoordInput(false)} style={{ padding: '0.5rem 1rem', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleCoordinateSubmit} style={{ padding: '0.5rem 1rem', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Config Pricing */}
      {showSettings && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 4000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', width: '90%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Configurar Precios</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>Define reglas de precio según distancia.</p>

            <div style={{ marginBottom: '1rem' }}>
              {pricingRules.map((rule, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem' }}>Hasta</span>
                  <input
                    type="number"
                    value={rule.maxKm}
                    onChange={(e) => {
                      const newRules = [...pricingRules];
                      newRules[idx].maxKm = parseFloat(e.target.value);
                      setPricingRules(newRules);
                    }}
                    style={{ width: '60px', padding: '4px' }}
                  />
                  <span style={{ fontSize: '0.9rem' }}>km:</span>
                  <span style={{ fontWeight: 'bold' }}>$</span>
                  <input
                    type="number"
                    value={rule.price}
                    onChange={(e) => {
                      const newRules = [...pricingRules];
                      newRules[idx].price = parseFloat(e.target.value);
                      setPricingRules(newRules);
                    }}
                    style={{ width: '60px', padding: '4px' }}
                  />
                  <button
                    onClick={() => {
                      const newRules = pricingRules.filter((_, i) => i !== idx);
                      setPricingRules(newRules);
                    }}
                    style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer' }}
                  >
                    x
                  </button>
                </div>
              ))}
              <button
                onClick={() => setPricingRules([...pricingRules, { maxKm: 999, price: 0 }])}
                style={{ background: '#2196F3', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginTop: '4px' }}
              >
                + Nueva Regla
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setShowSettings(false)} style={{ padding: '0.5rem 1rem', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Listo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
