import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import PageBlock from './PageBlock'

export default function Editor({ pages, activeId, onSelect, onUpdate, onAdd, onDelete, onReorder, selectedDrawingId, onSelectDrawing }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIdx = pages.findIndex(p => p.id === active.id)
      const newIdx = pages.findIndex(p => p.id === over.id)
      onReorder(arrayMove(pages, oldIdx, newIdx))
    }
  }

  return (
    <main style={{
      flex: 1,
      overflowY: 'auto',
      padding: '40px 48px',
    }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {pages.map(page => (
            <PageBlock
              key={page.id}
              page={page}
              isActive={activeId === page.id}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onAdd={onAdd}
              onDelete={onDelete}
              selectedDrawingId={selectedDrawingId}
              onSelectDrawing={onSelectDrawing}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <button
          onClick={() => onAdd(pages[pages.length - 1]?.id, 'hoofdstuk')}
          style={{
            background: 'none',
            border: '1px dashed #ccc',
            borderRadius: '6px',
            padding: '10px 24px',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#aaa',
            fontFamily: 'Georgia, serif',
            width: '100%',
          }}
        >
          + Nieuwe pagina
        </button>
      </div>
    </main>
  )
}
