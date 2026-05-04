import { useRef, useEffect, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DrawingBlock from './DrawingBlock'

const newTextItem = (content = '') => ({ id: crypto.randomUUID(), type: 'text', content })
const newDrawingItem = () => ({ id: crypto.randomUUID(), type: 'drawing', data: null, height: 240 })

export default function PageBlock({ page, isActive, onSelect, onUpdate, onAdd, onDelete, selectedDrawingId, onSelectDrawing }) {
  const containerRef = useRef(null)
  const photoInputRef = useRef(null)
  const [activeItemId, setActiveItemId] = useState(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })
  const dndStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  const startResize = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const startH = containerRef.current.offsetHeight
    const onMove = (ev) => onUpdate(page.id, 'minHeight', Math.max(80, startH + (ev.clientY - startY)))
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const items = page.items || [newTextItem()]
  const setItems = (newItems) => onUpdate(page.id, 'items', newItems)

  const updateItem = (itemId, patch) =>
    setItems(items.map(it => it.id === itemId ? { ...it, ...patch } : it))

  const removeItem = (itemId) => {
    const next = items.filter(it => it.id !== itemId)
    setItems(next.length === 0 ? [newTextItem()] : next)
  }

  const addDrawingItem = () => {
    const insertAfterIdx = activeItemId
      ? items.findIndex(it => it.id === activeItemId)
      : items.length - 1
    const next = [...items]
    next.splice(insertAfterIdx + 1, 0, newDrawingItem())
    setItems(next)
  }

  // ─── Photo ─────────────────────────────────────────────
  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const maxW = 400
        const w = Math.min(img.naturalWidth, maxW)
        const h = (img.naturalHeight / img.naturalWidth) * w
        const photoItem = { id: crypto.randomUUID(), type: 'image', src: ev.target.result, offsetX: 0, width: w, height: h }
        const insertAfterIdx = activeItemId ? items.findIndex(it => it.id === activeItemId) : items.length - 1
        const next = [...items]
        next.splice(insertAfterIdx + 1, 0, photoItem)
        if (!next[insertAfterIdx + 2] || next[insertAfterIdx + 2].type !== 'text') {
          next.splice(insertAfterIdx + 2, 0, newTextItem())
        }
        setItems(next)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const startImageDrag = (e, item) => {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX
    const startOffset = item.offsetX || 0
    const onMove = (ev) => updateItem(item.id, { offsetX: startOffset + (ev.clientX - startX) })
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ─── Render ────────────────────────────────────────────
  return (
    <div ref={setNodeRef} style={dndStyle} id={`page-${page.id}`} onClick={() => onSelect(page.id)}>
      <div
        ref={containerRef}
        style={{
          background: '#fff',
          borderRadius: '8px',
          border: isActive ? '1px solid #bbb' : '1px solid #dedad4',
          marginBottom: '4px',
          position: 'relative',
          boxShadow: isActive ? '0 2px 12px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
          transition: 'box-shadow 0.2s, border-color 0.2s',
          minHeight: page.minHeight ? `${page.minHeight}px` : undefined,
        }}
      >
        {/* DnD handle */}
        <div {...attributes} {...listeners} style={{
          position: 'absolute', top: '8px', left: '10px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px',
          width: '12px', cursor: 'grab', zIndex: 2, padding: '2px',
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#d5d0c8' }} />
          ))}
        </div>

        {/* Top resize handle */}
        <div
          onMouseDown={e => {
            e.preventDefault(); e.stopPropagation()
            const startY = e.clientY
            const startH = containerRef.current.offsetHeight
            const onMove = ev => onUpdate(page.id, 'minHeight', Math.max(80, startH + (startY - ev.clientY)))
            const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
          }}
          style={{
            position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
            width: '32px', height: '4px', borderRadius: '2px', background: '#d5d0c8',
            cursor: 'ns-resize', zIndex: 2,
          }}
        />

        {/* Type label */}
        <div style={{
          position: 'absolute', top: '10px', right: '14px',
          fontSize: '11px', color: '#aaa', fontFamily: 'Georgia, serif', userSelect: 'none', zIndex: 2,
        }}>
          {page.type === 'kop2' ? 'Kop 2' : 'Hoofdstuk'}
        </div>

        {/* Content */}
        <div style={{ padding: '28px 16px 44px' }}>
          <input
            value={page.title}
            onChange={e => onUpdate(page.id, 'title', e.target.value)}
            placeholder={page.type === 'kop2' ? 'Kop 2' : 'Hoofdstuk'}
            style={{
              display: 'block', width: '100%', border: 'none', outline: 'none',
              fontFamily: 'Georgia, serif', fontSize: page.type === 'kop2' ? '16px' : '20px',
              fontWeight: 'bold', color: '#1a1a1a', background: 'transparent', marginBottom: '12px', padding: 0,
            }}
          />

          {items.map((item) => {
            if (item.type === 'text') {
              return (
                <AutoTextarea
                  key={item.id}
                  value={item.content}
                  onChange={val => updateItem(item.id, { content: val })}
                  onFocus={() => setActiveItemId(item.id)}
                  onShiftEnter={() => onAdd(page.id, 'hoofdstuk')}
                />
              )
            }

            if (item.type === 'image') {
              return (
                <div
                  key={item.id}
                  style={{
                    marginLeft: Math.max(0, item.offsetX || 0),
                    marginBottom: '8px',
                    display: 'inline-block',
                    position: 'relative',
                    cursor: 'grab',
                    userSelect: 'none',
                    maxWidth: '100%',
                  }}
                  onMouseDown={e => startImageDrag(e, item)}
                >
                  <img
                    src={item.src}
                    draggable={false}
                    style={{ width: item.width, maxWidth: '100%', display: 'block', borderRadius: '3px', pointerEvents: 'none' }}
                    alt=""
                  />
                  {isActive && (
                    <button
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => removeItem(item.id)}
                      style={{
                        position: 'absolute', top: '4px', right: '4px',
                        background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none',
                        borderRadius: '50%', width: '18px', height: '18px',
                        cursor: 'pointer', fontSize: '10px', lineHeight: '18px', padding: 0, textAlign: 'center',
                      }}
                    >✕</button>
                  )}
                </div>
              )
            }

            if (item.type === 'drawing') {
              return (
                <DrawingBlock
                  key={item.id}
                  item={item}
                  onUpdate={(id, patch) => updateItem(id, patch)}
                  onRemove={removeItem}
                  isSelectedForAI={selectedDrawingId === item.id}
                  onSelectForAI={(it) => onSelectDrawing && onSelectDrawing(page.id, it)}
                />
              )
            }

            return null
          })}
        </div>

        {/* Legacy whole-page drawing */}
        {page.drawing && (
          <img
            src={page.drawing}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', borderRadius: '8px' }}
            alt=""
          />
        )}

        {/* Bottom resize handle */}
        <div
          onMouseDown={startResize}
          style={{
            position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
            width: '32px', height: '4px', borderRadius: '2px', background: '#e8e4de',
            zIndex: 1, cursor: 'ns-resize',
          }}
        />
        <div style={{ position: 'absolute', bottom: '8px', right: '14px', fontSize: '11px', color: '#ccc', fontFamily: 'Georgia, serif', userSelect: 'none', zIndex: 1 }}>
          {page.createdAt}
        </div>
        {isActive && (
          <button onClick={e => { e.stopPropagation(); onDelete(page.id) }} style={{ position: 'absolute', bottom: '8px', left: '14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#ccc', padding: 0, zIndex: 1 }}>
            ✕ verwijder
          </button>
        )}
      </div>

      {/* Action buttons */}
      {isActive && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '4px 0 8px', flexWrap: 'wrap' }}>
          <button onClick={() => onAdd(page.id, 'hoofdstuk')} style={addBtnStyle}>+ Hoofdstuk</button>
          <button onClick={() => onAdd(page.id, 'kop2')} style={addBtnStyle}>+ Kop 2</button>
          <button onClick={() => photoInputRef.current.click()} style={addBtnStyle}>+ Foto</button>
          <button onClick={addDrawingItem} style={addBtnStyle}>✏ Tekenvak</button>
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
        </div>
      )}
    </div>
  )
}

function AutoTextarea({ value, onChange, onFocus, onShiftEnter }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={onFocus}
      onKeyDown={e => {
        if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); onShiftEnter() }
      }}
      placeholder="Begin hier met typen..."
      rows={1}
      style={{
        display: 'block', width: '100%', border: 'none', outline: 'none',
        resize: 'none', fontFamily: 'Georgia, serif', fontSize: '14px',
        lineHeight: '1.7', color: '#333', background: 'transparent',
        padding: 0, minHeight: '28px', overflow: 'hidden',
      }}
    />
  )
}

const addBtnStyle = {
  background: 'none', border: '1px solid #d5d0c8', borderRadius: '4px',
  padding: '4px 12px', fontSize: '12px', cursor: 'pointer', color: '#888', fontFamily: 'Georgia, serif',
}
