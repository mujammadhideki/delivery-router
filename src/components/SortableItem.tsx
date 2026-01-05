import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableItem(props: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        marginBottom: '8px',
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div style={{ display: 'flex', alignItems: 'flex-start', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', borderLeft: '4px solid #2196F3', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    style={{
                        padding: '10px',
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#999',
                        background: '#f5f5f5',
                        borderTopLeftRadius: '4px',
                        borderBottomLeftRadius: '4px',
                        borderRight: '1px solid #eee'
                    }}
                >
                    ⋮⋮
                </div>
                <div style={{ flex: 1 }}>
                    {props.children}
                </div>
            </div>
        </div>
    );
}
