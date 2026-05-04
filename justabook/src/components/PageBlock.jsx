import { useRef, useEffect, useState, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const COLORS = ['#1a1a1a', '#555', '#e03030', '#2060d0', '#e8a020', '#20a050']
const PEN_SIZES = [2, 5, 10]

const newTextItem = (content = '') => ({ id: crypto.randomUUID(), type: 'text', content })

export default function PageBlock({ page, isActive, onSelect, onUpdate, onAdd, onDelete }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const photoInputRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPos = useRef(null)
  const strokeHistory = useRef([])
  const [activeItemId, setActiveItemId] = useState(null)
  const [drawMode, setDrawMode] = useState(false)
  const [penColor, setPenColor] = useState('#1a1a1a')
  const [penSize, setPenSize] = useState(2)
  const [isEraser, setIsEraser] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })
  const dndStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  const startResize = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const startH = containerRef.current.offsetHeight

    const onMove = (ev) => {
      const newH = Math.max(80, startH + (ev.clientY - startY))
      onUpdate(page.id, 'minHeight', newH)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const items = page.items || [newTextItem()]

  // ─── Items helpers ─────────────────────────────────────
  const setItems = (newItems) => onUpdate(page.id, 'items', newItems)

  const updateItem = (itemId, patch) =>
    setItems(items.map(it => it.id === itemId ? { ...it, ...patch } : it))

  const removeItem = (itemId) => {
    const next = items.filter(it => it.id !== itemId)
    // Always keep at least one text item
    setItems(next.length === 0 ? [newTextItem()] : next)
  }

  // ─── Insert photo into flow ────────────────────────────
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

        // Insert after active text item, or at end
        const insertAfterIdx = activeItemId
          ? items.findIndex(it => it.id === activeItemId)
          : items.length - 1

        const next = [...items]
        next.splice(insertAfterIdx + 1, 0, photoItem)
        // Ensure there's a text item after the photo for continued typing
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

  // ─── Horizontal image drag ─────────────────────────────
  const startImageDrag = (e, item) => {
    if (drawMode) return
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startOffset = item.offsetX || 0

    const onMove = (ev) => {
      const dx = ev.clientX - startX
      updateItem(item.id, { offsetX: startOffset + dx })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ─── Drawing canvas ────────────────────────────────────
  useEffect(() => {
    if (!drawMode || !canvasRef.current || !containerRef.current) return
    const canvas = canvasRef.current
    const container = containerRef.current
    canvas.width = container.offsetWidth
    canvas.height = container.offsetHeight
    if (page.drawing) {
      const img = new Image()
      img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0)
      img.src = page.drawing
    }
  }, [drawMode])

  const getCanvasPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const startDraw = useCallback((e) => {
    if (!drawMode) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    strokeHistory.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    drawingRef.current = true
    lastPos.current = getCanvasPos(e, canvas)
  }, [drawMode])

  const draw = useCallback((e) => {
    if (!drawingRef.current || !drawMode) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getCanvasPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = penSize * 4
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = penColor
      ctx.lineWidth = penSize
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
    lastPos.current = pos
  }, [drawMode, penColor, penSize, isEraser])

  const stopDraw = useCallback(() => {
    if (drawingRef.current) {
      const canvas = canvasRef.current
      if (canvas?.width > 0) onUpdate(page.id, 'drawing', canvas.toDataURL())
    }
    drawingRef.current = false
    lastPos.current = null
  }, [onUpdate, page.id])

  const undoStroke = () => {
    if (strokeHistory.current.length === 0) return
    const prev = strokeHistory.current.pop()
    const canvas = canvasRef.current
    canvas.getContext('2d').putImageData(prev, 0, 0)
    if (canvas?.width > 0) onUpdate(page.id, 'drawing', canvas.toDataURL())
  }

  const exitDrawMode = () => {
    setDrawMode(false)
    strokeHistory.current = []
    setIsEraser(false)
  }

  // Klik buiten de pagina → stop automatisch met tekenen
  useEffect(() => {
    if (!drawMode) return
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) exitDrawMode()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [drawMode])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    strokeHistory.current = []
    onUpdate(page.id, 'drawing', null)
  }

  // ─── Render ────────────────────────────────────────────
  return (
    <div ref={setNodeRef} style={dndStyle} id={`page-${page.id}`} onClick={() => !drawMode && onSelect(page.id)}>
      <div
        ref={containerRef}
        style={{
          background: '#fff',
          borderRadius: '8px',
          border: drawMode ? '1px solid #aaa' : isActive ? '1px solid #bbb' : '1px solid #dedad4',
          marginBottom: '4px',
          position: 'relative',
          boxShadow: isActive ? '0 2px 12px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
          transition: 'box-shadow 0.2s, border-color 0.2s',
          minHeight: page.minHeight ? `${page.minHeight}px` : undefined,
        }}
      >
        {/* DnD handle — klein icoontje links */}
        {!drawMode && (
          <div {...attributes} {...listeners} style={{
            position: 'absolute', top: '8px', left: '10px',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px',
            width: '12px', cursor: 'grab', zIndex: 2, padding: '2px',
          }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#d5d0c8' }} />
            ))}
          </div>
        )}

        {/* Top resize handle */}
        {!drawMode && (
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
        )}

        {/* Type label */}
        <div style={{
          position: 'absolute', top: '10px', right: '14px',
          fontSize: '11px', color: '#aaa', fontFamily: 'Georgia, serif', userSelect: 'none', zIndex: 2,
        }}>
          {page.type === 'kop2' ? 'Kop 2' : 'Hoofdstuk'}
        </div>

        {/* Content */}
        <div style={{ padding: '28px 16px 44px' }}>
          {/* Title */}
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

          {/* Items in flow */}
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
                    cursor: drawMode ? 'default' : 'grab',
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
                  {isActive && !drawMode && (
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

            return null
          })}
        </div>

        {/* Tekening altijd zichtbaar als img buiten draw mode */}
        {page.drawing && !drawMode && (
          <img
            src={page.drawing}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', borderRadius: '8px' }}
            alt=""
          />
        )}

        {/* Drawing canvas overlay */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            pointerEvents: drawMode ? 'all' : 'none',
            cursor: drawMode ? (isEraser ? 'cell' : 'crosshair') : 'default',
            zIndex: drawMode ? 10 : 0,
            borderRadius: '8px',
          }}
        />

        {/* Draw toolbar */}
        {drawMode && (
          <div
            style={{
              position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 20, background: 'rgba(255,255,255,0.95)', borderRadius: '20px',
              padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.12)', border: '1px solid #e8e4de', whiteSpace: 'nowrap',
            }}
            onMouseDown={e => e.stopPropagation()}
          >
            {COLORS.map(c => (
              <button key={c} onClick={() => { setPenColor(c); setIsEraser(false) }} style={{
                width: '16px', height: '16px', borderRadius: '50%', background: c, padding: 0,
                border: !isEraser && penColor === c ? '2px solid #fff' : '2px solid transparent',
                outline: !isEraser && penColor === c ? `2px solid ${c}` : 'none',
                cursor: 'pointer', flexShrink: 0, opacity: isEraser ? 0.4 : 1,
              }} />
            ))}
            <div style={{ width: '1px', height: '16px', background: '#e0ddd8' }} />
            {PEN_SIZES.map((s, i) => (
              <button key={s} onClick={() => setPenSize(s)} style={{
                width: '20px', height: '20px', borderRadius: '50%', padding: 0,
                background: penSize === s ? (isEraser ? '#aaa' : '#1a1a1a') : 'transparent',
                border: '1px solid #ccc', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <div style={{ width: `${4 + i * 3}px`, height: `${4 + i * 3}px`, borderRadius: '50%', background: penSize === s ? '#fff' : '#1a1a1a' }} />
              </button>
            ))}
            <div style={{ width: '1px', height: '16px', background: '#e0ddd8' }} />
            <button onClick={() => setIsEraser(v => !v)} title="Gummetje" style={{
              ...toolBtnStyle,
              background: isEraser ? '#f0ede8' : 'none',
              borderRadius: '4px',
              padding: '2px 4px',
              border: isEraser ? '1px solid #ccc' : '1px solid transparent',
              fontSize: '14px',
            }}>◻</button>
            <div style={{ width: '1px', height: '16px', background: '#e0ddd8' }} />
            <button onClick={undoStroke} title="Ongedaan maken" style={toolBtnStyle}>↩</button>
          </div>
        )}

        {/* Footer */}
        <div
          onMouseDown={!drawMode ? startResize : undefined}
          style={{
            position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
            width: '32px', height: '4px', borderRadius: '2px', background: '#e8e4de',
            zIndex: 1, cursor: drawMode ? 'default' : 'ns-resize',
          }}
        />
        <div style={{ position: 'absolute', bottom: '8px', right: '14px', fontSize: '11px', color: '#ccc', fontFamily: 'Georgia, serif', userSelect: 'none', zIndex: 1 }}>
          {page.createdAt}
        </div>
        {isActive && !drawMode && (
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
          <button onClick={() => setDrawMode(true)} style={addBtnStyle}>✏ Tekenen</button>
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
        </div>
      )}
    </div>
  )
}

// Auto-resizing textarea component
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
        if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault()
          onShiftEnter()
        }
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

const toolBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: '0 2px', fontSize: '13px', lineHeight: 1,
}
