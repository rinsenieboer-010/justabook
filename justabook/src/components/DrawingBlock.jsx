import { useRef, useEffect, useState, useCallback } from 'react'

const COLORS = ['#1a1a1a', '#555', '#e03030', '#2060d0', '#e8a020', '#20a050']
const PEN_SIZES = [2, 5, 10]

export default function DrawingBlock({ item, onUpdate, onRemove, onSelectForAI, isSelectedForAI }) {
  const canvasRef    = useRef(null)
  const containerRef = useRef(null)
  const drawingRef   = useRef(false)
  const lastPos      = useRef(null)
  const strokeHistory = useRef([])

  const [active,   setActive]   = useState(false)
  const [penColor, setPenColor] = useState('#1a1a1a')
  const [penSize,  setPenSize]  = useState(2)
  const [isEraser, setIsEraser] = useState(false)
  const height = item.height || 200

  useEffect(() => {
    if (!active || !canvasRef.current || !containerRef.current) return
    const canvas = canvasRef.current
    canvas.width  = containerRef.current.offsetWidth
    canvas.height = height
    if (item.data) {
      const img = new Image()
      img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0)
      img.src = item.data
    }
  }, [active])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    return { x: (cx - rect.left) * (canvas.width / rect.width), y: (cy - rect.top) * (canvas.height / rect.height) }
  }

  const startDraw = useCallback((e) => {
    if (!active) return
    e.preventDefault()
    const canvas = canvasRef.current
    strokeHistory.current.push(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height))
    drawingRef.current = true
    lastPos.current = getPos(e, canvas)
  }, [active])

  const draw = useCallback((e) => {
    if (!drawingRef.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over'
    ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : penColor
    ctx.lineWidth   = isEraser ? penSize * 4 : penSize
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
    lastPos.current = pos
  }, [penColor, penSize, isEraser])

  const stopDraw = useCallback(() => {
    if (drawingRef.current) {
      const canvas = canvasRef.current
      if (canvas?.width > 0) onUpdate(item.id, { data: canvas.toDataURL() })
    }
    drawingRef.current = false
    lastPos.current = null
  }, [onUpdate, item.id])

  const undoStroke = () => {
    if (!strokeHistory.current.length) return
    const canvas = canvasRef.current
    canvas.getContext('2d').putImageData(strokeHistory.current.pop(), 0, 0)
    onUpdate(item.id, { data: canvas.toDataURL() })
  }

  const exitActive = () => { setActive(false); strokeHistory.current = []; setIsEraser(false) }

  useEffect(() => {
    if (!active) return
    const handler = (e) => { if (!containerRef.current?.contains(e.target)) exitActive() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [active])

  const startResize = (e) => {
    e.preventDefault(); e.stopPropagation()
    const startY = e.clientY
    const startH = height
    const onMove = (ev) => onUpdate(item.id, { height: Math.max(60, startH + (ev.clientY - startY)) })
    const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const toolBtn = { background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: '0 2px', fontSize: '13px' }

  return (
    <div ref={containerRef} style={{ marginBottom: '8px', userSelect: 'none' }}>
      {/* Canvas area */}
      <div
        onClick={() => !active && setActive(true)}
        style={{
          position: 'relative', height: `${height}px`, borderRadius: '6px', overflow: 'hidden',
          border: isSelectedForAI ? '2px solid #2563EB' : active ? '2px solid #bbb' : '1.5px dashed #d5d0c8',
          background: '#fafaf7', cursor: active ? 'default' : 'pointer',
          boxShadow: isSelectedForAI ? '0 0 0 3px #DBEAFE' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        {!item.data && !active && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontFamily: 'Georgia, serif', fontSize: '13px', pointerEvents: 'none' }}>
            ✏ Klik om te tekenen
          </div>
        )}

        {item.data && !active && (
          <img src={item.data} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} alt="" />
        )}

        {active && (
          <canvas
            ref={canvasRef}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: isEraser ? 'cell' : 'crosshair' }}
          />
        )}

        {/* Toolbar */}
        {active && (
          <div onMouseDown={e => e.stopPropagation()} style={{
            position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 20, background: 'rgba(255,255,255,0.95)', borderRadius: '20px',
            padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.12)', border: '1px solid #e8e4de', whiteSpace: 'nowrap',
          }}>
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
                background: penSize === s ? '#1a1a1a' : 'transparent',
                border: '1px solid #ccc', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <div style={{ width: `${4 + i * 3}px`, height: `${4 + i * 3}px`, borderRadius: '50%', background: penSize === s ? '#fff' : '#1a1a1a' }} />
              </button>
            ))}
            <div style={{ width: '1px', height: '16px', background: '#e0ddd8' }} />
            <button onClick={() => setIsEraser(v => !v)} style={{ ...toolBtn, background: isEraser ? '#f0ede8' : 'none', border: isEraser ? '1px solid #ccc' : '1px solid transparent', borderRadius: '4px', padding: '2px 4px', fontSize: '14px' }}>◻</button>
            <div style={{ width: '1px', height: '16px', background: '#e0ddd8' }} />
            <button onClick={undoStroke} style={toolBtn}>↩</button>
            <div style={{ width: '1px', height: '16px', background: '#e0ddd8' }} />
            <button onClick={exitActive} style={{ ...toolBtn, fontSize: '11px', fontFamily: 'Georgia, serif' }}>Klaar</button>
          </div>
        )}
      </div>

      {/* Controls onder het blok */}
      {!active && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onSelectForAI(item) }}
            style={{
              padding: '2px 10px', fontSize: '11px', fontFamily: 'Georgia, serif',
              border: `1px solid ${isSelectedForAI ? '#2563EB' : '#d5d0c8'}`,
              borderRadius: '4px',
              background: isSelectedForAI ? '#DBEAFE' : 'none',
              color: isSelectedForAI ? '#2563EB' : '#aaa',
              cursor: 'pointer',
            }}
          >
            {isSelectedForAI ? '✓ Voor AI geselecteerd' : 'Selecteer voor AI'}
          </button>
          <div style={{ flex: 1 }} />
          <div onMouseDown={startResize} style={{ padding: '2px 8px', fontSize: '11px', color: '#ccc', cursor: 'ns-resize', fontFamily: 'Georgia, serif', border: '1px solid #e8e4de', borderRadius: '4px' }}>↕</div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
            style={{ background: 'none', border: '1px solid #f0c0c0', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: '#e03030', fontFamily: 'Georgia, serif', padding: '2px 8px' }}
          >
            ✕ verwijder
          </button>
        </div>
      )}
    </div>
  )
}
