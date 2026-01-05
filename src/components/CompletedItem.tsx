import { useState } from 'react';
import type { Delivery } from '../App';

interface CompletedItemProps {
    delivery: Delivery;
    onDelete: (id: string) => void;
    onUndo: (id: string) => void;
}

export const CompletedItem = ({ delivery, onDelete, onUndo }: CompletedItemProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            style={{
                padding: '1rem',
                background: '#f5f5f5',
                borderRadius: '6px',
                border: '1px solid #eee',
                opacity: 0.9,
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            }}
            onClick={() => setIsOpen(!isOpen)}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(delivery.id);
                }}
                style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    lineHeight: 1,
                    zIndex: 10
                }}
                title="Eliminar historial"
            >
                ×
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isOpen ? '10px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem', color: '#666', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                    <strong style={{ color: '#666', textDecoration: 'line-through' }}>{delivery.address}</strong>
                </div>
                <span style={{ fontSize: '0.75rem', background: '#e8f5e9', color: '#2e7d32', padding: '2px 6px', borderRadius: '4px' }}>Entregado</span>
            </div>

            {isOpen && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ddd', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ fontSize: '0.9rem', marginBottom: '5px' }}>
                        <strong>Cliente:</strong> {delivery.customer.name || '-'}
                    </div>
                    <div style={{ fontSize: '0.9rem', marginBottom: '5px' }}>
                        <strong>Teléfono:</strong> {delivery.customer.phone || '-'}
                    </div>
                    {delivery.order.items && (
                        <div style={{
                            fontSize: '0.9rem',
                            marginBottom: '10px',
                            color: '#333',
                            padding: '8px',
                            background: '#fff',
                            borderRadius: '4px',
                            borderLeft: '3px solid #ccc'
                        }}>
                            <strong>Artículos:</strong><br />
                            {delivery.order.items}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                            Pedido: ${delivery.order.amount?.toFixed(2) || '0.00'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#666', textAlign: 'right' }}>
                            Delivery: ${delivery.order.deliveryFee?.toFixed(2) || '0.00'}
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '5px',
                        padding: '8px',
                        background: '#eee',
                        borderRadius: '4px'
                    }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                            Total: ${((delivery.order.amount || 0) + (delivery.order.deliveryFee || 0)).toFixed(2)}
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: delivery.order.isPaid ? '#e8f5e9' : '#ffebee',
                            color: delivery.order.isPaid ? '#2e7d32' : '#c62828',
                            fontWeight: 'bold'
                        }}>
                            {delivery.order.isPaid ? 'Pagado' : 'Por Pagar'}
                        </div>
                    </div>
                    {delivery.order.paymentDetails && (
                        <div style={{ marginTop: '5px', fontSize: '0.85rem', color: '#666', padding: '4px' }}>
                            <strong>Nota de Pago:</strong> {delivery.order.paymentDetails}
                        </div>
                    )}

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onUndo(delivery.id);
                        }}
                        style={{
                            fontSize: '0.8rem',
                            color: '#2196F3',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            marginTop: '15px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            display: 'block'
                        }}
                    >
                        Deshacer (Volver a Pendiente)
                    </button>
                </div>
            )}

            {!isOpen && (
                <div style={{ fontSize: '0.8rem', color: '#888', marginLeft: '20px' }}>
                    {delivery.customer.name || 'Sin nombre'} - {delivery.order.isPaid ? 'Pagado' : 'Por Pagar'}
                </div>
            )}
        </div>
    );
};
