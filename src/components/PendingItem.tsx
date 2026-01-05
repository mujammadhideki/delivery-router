import { useState } from 'react';
import type { Delivery } from '../App';
import { LatLng } from 'leaflet';

interface PendingItemProps {
    delivery: Delivery;
    idx: number;
    isMobile: boolean;
    highlightedId: string | null;
    start: LatLng | null;
    onDelete: (id: string) => void;
    onUpdate: (id: string, updates: any) => void;
    onMarkDelivered: (id: string) => void;
    onMove: (id: string, direction: 'up' | 'down') => void;
    isFirst: boolean;
    isLast: boolean;
    itemRef: (el: HTMLDivElement | null) => void;
}

export const PendingItem = ({
    delivery,
    idx,
    highlightedId,
    start,
    onDelete,
    onUpdate,
    onMarkDelivered,
    onMove,
    isFirst,
    isLast,
    itemRef
}: PendingItemProps) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div
            ref={itemRef}
            style={{
                padding: '10px',
                background: highlightedId === delivery.id ? '#fff9c4' : 'transparent',
                transition: 'background 0.3s ease',
                borderRadius: '4px',
                cursor: 'pointer'
            }}
            onClick={() => setIsOpen(!isOpen)}
        >
            <div style={{ fontWeight: 'bold', color: '#555', marginBottom: isOpen ? '8px' : '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{
                        fontSize: '0.8rem',
                        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        color: '#999'
                    }}>▶</span>
                    <span>Parada {idx + 1}</span>
                    <span style={{ fontSize: '0.7rem', background: '#e3f2fd', color: '#1976D2', padding: '2px 6px', borderRadius: '4px' }}>Pendiente</span>
                </div>

                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {/* Manual Move Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '8px' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onMove(delivery.id, 'up'); }}
                            disabled={isFirst}
                            style={{
                                background: '#f0f0f0',
                                border: '1px solid #ddd',
                                borderRadius: '3px',
                                padding: '2px 6px',
                                cursor: isFirst ? 'not-allowed' : 'pointer',
                                fontSize: '0.6rem',
                                opacity: isFirst ? 0.3 : 1
                            }}
                            title="Subir"
                        >
                            ▲
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onMove(delivery.id, 'down'); }}
                            disabled={isLast}
                            style={{
                                background: '#f0f0f0',
                                border: '1px solid #ddd',
                                borderRadius: '3px',
                                padding: '2px 6px',
                                cursor: isLast ? 'not-allowed' : 'pointer',
                                fontSize: '0.6rem',
                                opacity: isLast ? 0.3 : 1
                            }}
                            title="Bajar"
                        >
                            ▼
                        </button>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(delivery.id);
                        }}
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
            </div>

            {!isOpen && (
                <div style={{ fontSize: '0.85rem', color: '#666', marginLeft: '18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {delivery.address}
                </div>
            )}

            {isOpen && (
                <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="Dirección"
                        value={delivery.address}
                        onChange={(e) => onUpdate(delivery.id, { address: e.target.value })}
                        style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box', marginBottom: '4px' }}
                    />

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                            <input type="text" placeholder="Nombre" value={delivery.customer.name} onChange={(e) => onUpdate(delivery.id, { customer: { name: e.target.value } })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                            <input type="text" placeholder="Teléfono" value={delivery.customer.phone} onChange={(e) => onUpdate(delivery.id, { customer: { phone: e.target.value } })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <textarea
                        placeholder="Detalles del Pedido"
                        value={delivery.order.items}
                        onChange={(e) => onUpdate(delivery.id, { order: { items: e.target.value } })}
                        style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', resize: 'vertical', minHeight: '60px', marginBottom: '4px', boxSizing: 'border-box' }}
                    />

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <label style={{ fontSize: '0.7rem', color: '#666', marginLeft: '2px' }}>Pedido</label>
                            <span style={{ position: 'absolute', left: '8px', top: '26px', color: '#666' }}>$</span>
                            <input type="number" placeholder="0.00" value={delivery.order.amount || ''} onChange={(e) => onUpdate(delivery.id, { order: { amount: parseFloat(e.target.value) } })} style={{ padding: '8px 8px 8px 20px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <label style={{ fontSize: '0.7rem', color: '#666', marginLeft: '2px' }}>
                                Delivery {start ? `(${(start.distanceTo(delivery.location) / 1000).toFixed(1)}km)` : ''}
                            </label>
                            <span style={{ position: 'absolute', left: '8px', top: '26px', color: '#666' }}>$</span>
                            <input type="number" placeholder="0.00" value={delivery.order.deliveryFee || ''} onChange={(e) => onUpdate(delivery.id, { order: { deliveryFee: parseFloat(e.target.value) } })} style={{ padding: '8px 8px 8px 20px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f8f8f8',
                        padding: '10px',
                        borderRadius: '4px',
                        marginBottom: '4px'
                    }}>
                        <div style={{ fontWeight: 'bold' }}>
                            Total: ${((delivery.order.amount || 0) + (delivery.order.deliveryFee || 0)).toFixed(2)}
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                                onClick={() => onUpdate(delivery.id, { order: { isPaid: false } })}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '0.75rem',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd',
                                    background: !delivery.order.isPaid ? '#ffebee' : '#fff',
                                    color: !delivery.order.isPaid ? '#c62828' : '#666',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Por Pagar
                            </button>
                            <button
                                onClick={() => onUpdate(delivery.id, { order: { isPaid: true } })}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '0.75rem',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd',
                                    background: delivery.order.isPaid ? '#e8f5e9' : '#fff',
                                    color: delivery.order.isPaid ? '#2e7d32' : '#666',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Pagado
                            </button>
                        </div>
                    </div>

                    {!delivery.order.isPaid && (
                        <input
                            type="text"
                            placeholder="Detalles del pago (ej. Pago Móvil, Efvo...)"
                            value={delivery.order.paymentDetails || ''}
                            onChange={(e) => onUpdate(delivery.id, { order: { paymentDetails: e.target.value } })}
                            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}
                        />
                    )}

                    <button
                        onClick={() => onMarkDelivered(delivery.id)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: '#333',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            marginTop: '5px',
                            transition: 'background 0.2s'
                        }}
                    >
                        Marcar Entregado
                    </button>
                </div>
            )}
        </div>
    );
};
