import { useRef, useEffect, useState } from 'react'

const COLORS = ['#1a1a1a', '#555', '#e03030', '#2060d0', '#e8a020', '#20a050']
const PEN_SIZES = [2, 4, 8]

export default function DrawingBlock({ item, onUpdate, onRemove, onSelectForAI, isSelectedForAI }) {
  const canvasRef = useRef(null)
  const wrapperRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPos = useRef(null)
  const strokeHistory = useRef([])
  const savedData = useRef(item.data || null)
  const [penColor, setPenColor] = useState('#1a1a1a')
  const [penSize, setPenSize] = useState(2)
  const [isEraser, setIsEraser] = useState(false)
  const [showTools, setShowTools] = useState(false)

  const height = item.height || 240
  const width = item.width || null // null = full width

  // Init canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth || 600
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (savedData.current) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      img.src = savedData.current
    }
  }, [])

  // Reageer op externe data-updates (bijv. AI-resultaat)
  useEffect(() => {
    if (!item.data || item.data === savedData.current) return
    if (drawingRef.current) return
    savedData.current = item.data
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new Image()
    img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    img.src = item.data
  }, [item.data])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const startDraw = (e) => {
    e.preventDefault()
    setShowTools(true)
    const canvas = canvasRef.current
    strokeHistory.current.push(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height))
    drawingRef.current = true
    lastPos.current = getPos(e, canvas)
  }

  const draw = (e) => {
    if (!drawingRef.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
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
  }

  const stopDraw = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastPos.current = null
    const canvas = canvasRef.current
    if (canvas) {
      const dataUrl = canvas.toDataURL()
      savedData.current = dataUrl
      onUpdate(item.id, { data: dataUrl })
    }
  }

  const undo = () => {
    if (strokeHistory.current.length === 0) return
    const canvas = canvasRef.current
    canvas.getContext('2d').putImageData(strokeHistory.current.pop(), 0, 0)
    const dataUrl = canvas.toDataURL()
    savedData.current = dataUrl
    onUpdate(item.id, { data: dataUrl })
  }

  // Height resize (bottom handle)
  const startHeightResize = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const startH = height
    let finalH = startH
    const onMove = (ev) => {
      finalH = Math.max(80, startH + (ev.clientY - startY))
      onUpdate(item.id, { height: finalH })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const canvas = canvasRef.current
      if (!canvas) return
      const current = savedData.current
      canvas.height = finalH
      const ctx2 = canvas.getContext('2d')
      ctx2.fillStyle = '#ffffff'
      ctx2.fillRect(0, 0, canvas.width, finalH)
      if (current) {
        const img = new Image()
        img.onload = () => ctx2.drawImage(img, 0, 0, canvas.width, finalH)
        img.src = current
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Width resize (right handle)
  const startWidthResize = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const containerWidth = wrapperRef.current?.parentElement?.offsetWidth || 600
    const startW = width || containerWidth
    let finalW = startW
    const onMove = (ev) => {
      finalW = Math.max(80, Math.min(containerWidth, startW + (ev.clientX - startX)))
      onUpdate(item.id, { width: finalW >= containerWidth - 8 ? null : finalW })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const canvas = canvasRef.current
      if (!canvas) return
      const current = savedData.current
      canvas.width = finalW >= containerWidth - 8 ? containerWidth : finalW
      canvas.height = height
      const ctx3 = canvas.getContext('2d')
      ctx3.fillStyle = '#ffffff'
      ctx3.fillRect(0, 0, canvas.width, canvas.height)
      if (current) {
        const img = new Image()
        img.onload = () => ctx3.drawImage(img, 0, 0, canvas.width, canvas.height)
        img.src = current
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const isNarrowed = width !== null

  return (
    <div
      ref={wrapperRef}
      style={{
        float: isNarrowed ? 'left' : 'none',
        width: isNarrowed ? `${width}px` : '100%',
        marginRight: isNarrowed ? '12px' : 0,
        marginBottom: '8px',
        userSelect: 'none',
        boxSizing: 'border-box',
      }}
    >
      {/* Canvas area */}
      <div style={{
        position: 'relative',
        borderRadius: '6px',
        border: isSelectedForAI ? '2px solid #2563EB' : '1px solid #e8e4de',
        background: '#fafaf7',
        overflow: 'hidden',
        boxShadow: isSelectedForAI ? '0 0 0 3px #DBEAFE' : 'none',
      }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          style={{
            display: 'block',
            width: '100%',
            height: `${height}px`,
            cursor: isEraser ? 'cell' : 'crosshair',
            touchAction: 'none',
          }}
        />

        {/* Bottom resize handle */}
        <div
          onMouseDown={startHeightResize}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '14px', cursor: 'ns-resize',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.03))',
          }}
        >
          <div style={{ width: '32px', height: '4px', borderRadius: '2px', background: '#d5d0c8' }} />
        </div>

        {/* Right resize handle */}
        <div
          onMouseDown={startWidthResize}
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: '14px', cursor: 'ew-resize',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(to left, rgba(0,0,0,0.03), transparent)',
          }}
        >
          <div style={{ width: '4px', height: '32px', borderRadius: '2px', background: '#d5d0c8' }} />
        </div>
      </div>

      {/* Drawing tools */}
      {showTools && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', flexWrap: 'wrap' }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => { setPenColor(c); setIsEraser(false) }} style={{
              width: '14px', height: '14px', borderRadius: '50%', background: c, padding: 0, flexShrink: 0,
              border: !isEraser && penColor === c ? '2px solid #fff' : '2px solid transparent',
              outline: !isEraser && penColor === c ? `2px solid ${c}` : 'none',
              cursor: 'pointer',
            }} />
          ))}
          <div style={{ width: '1px', height: '14px', background: '#e0ddd8' }} />
          {PEN_SIZES.map(s => (
            <button key={s} onClick={() => { setPenSize(s); setIsEraser(false) }} style={{
              width: '18px', height: '18px', borderRadius: '50%', padding: 0, flexShrink: 0,
              background: !isEraser && penSize === s ? '#1a1a1a' : 'transparent',
              border: '1px solid #ccc', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: `${s + 2}px`, height: `${s + 2}px`, borderRadius: '50%', background: !isEraser && penSize === s ? '#fff' : '#1a1a1a' }} />
            </button>
          ))}
          <div style={{ width: '1px', height: '14px', background: '#e0ddd8' }} />
          <button onClick={() => setIsEraser(v => !v)} style={{
            padding: '1px 8px', fontSize: '11px', fontFamily: 'Georgia, serif',
            border: isEraser ? '1px solid #ccc' : '1px solid transparent',
            borderRadius: '4px', background: isEraser ? '#f0ede8' : 'none',
            cursor: 'pointer', color: '#888',
          }}>gum</button>
          <button onClick={undo} style={{
            padding: '1px 8px', fontSize: '13px', border: '1px solid transparent',
            borderRadius: '4px', background: 'none', cursor: 'pointer', color: '#888',
          }}>↩</button>
        </div>
      )}

      {/* Action row */}
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
          {isSelectedForAI ? '✓ Voor AI' : 'AI'}
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
          style={{
            padding: '2px 8px', fontSize: '11px', fontFamily: 'Georgia, serif',
            border: '1px solid #f0c0c0', borderRadius: '4px',
            background: 'none', color: '#e03030', cursor: 'pointer',
          }}
        >✕</button>
      </div>
    </div>
  )
}
