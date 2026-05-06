import { useState } from 'react'

export default function AiPanel({ activePage, selectedDrawing, onUpdateDrawing, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(null)
  const [drawInput, setDrawInput] = useState('')
  const [drawResult, setDrawResult] = useState(null)
  const [error, setError] = useState(null)

  const hasSketch = !!selectedDrawing?.dataUrl
  const hasText = drawInput.trim().length > 0

  const getPageText = () => {
    if (!activePage?.items) return ''
    return activePage.items.filter(it => it.type === 'text').map(it => it.content).join('\n---\n')
  }

  const applyTextResult = (result) => {
    if (!activePage) return
    const parts = result.split('\n---\n')
    const textItems = activePage.items.filter(it => it.type === 'text')
    let textIdx = 0
    const newItems = activePage.items.map(it =>
      it.type === 'text' ? { ...textItems[textIdx], content: parts[textIdx++] ?? textItems[textIdx - 1].content } : it
    )
    onUpdate(activePage.id, 'items', newItems)
  }

  const runTextAction = async (action) => {
    setError(null)
    setLoading(action)
    try {
      if (!activePage) return
      const content = getPageText()
      if (!content.trim()) return
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      applyTextResult(data.result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  const runDrawingHelp = async () => {
    if (!hasSketch && !hasText) return
    setError(null)
    setDrawResult(null)
    setLoading('tekenhulp')
    try {
      if (hasSketch) {
        // Sketch (+ optional text instruction) → generate SVG → update drawing block
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'refine_sketch',
            imageData: selectedDrawing.dataUrl,
            hint: hasText ? drawInput.trim() : undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        onUpdateDrawing(selectedDrawing.pageId, selectedDrawing.itemId, data.result)
      } else {
        // Text only → generate step-by-step drawing instructions
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'drawing', content: drawInput.trim() }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setDrawResult(data.result)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  const btnLabel = () => {
    if (loading === 'tekenhulp') return 'Bezig...'
    return 'Enter'
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, height: '100vh',
      zIndex: 100, display: 'flex', alignItems: 'stretch', pointerEvents: 'none',
    }}>
      {/* Bookmark tab */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          pointerEvents: 'all',
          alignSelf: 'flex-start',
          marginTop: '72px',
          width: '28px',
          padding: '12px 0 14px',
          background: '#1a1a1a',
          border: 'none',
          borderRadius: '6px 0 0 6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '-2px 2px 8px rgba(0,0,0,0.15)',
          flexShrink: 0,
        }}
      >
        <span style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: '#f0ede8',
          fontFamily: 'Georgia, serif',
          userSelect: 'none',
        }}>AI</span>
      </button>

      {/* Panel */}
      <div style={{
        pointerEvents: 'all',
        width: open ? '220px' : '0px',
        overflow: 'hidden',
        transition: 'width 0.25s ease',
        background: '#18181b',
        height: '100vh',
        flexShrink: 0,
      }}>
        <div style={{
          width: '220px',
          padding: '28px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          height: '100%',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f0ede8', fontFamily: 'Georgia, serif', marginBottom: '4px' }}>
            AI-opties
          </div>

          {error && (
            <div style={{ fontSize: '11px', color: '#f87171', fontFamily: 'Georgia, serif', padding: '8px 10px', background: '#2d1a1a', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          {/* Tekst acties */}
          <ActionBtn
            label="Spellingfouten corrigeren"
            description="Corrigeert spelfouten zonder inhoud te veranderen."
            loading={loading === 'spelling'}
            disabled={!!loading}
            onClick={() => runTextAction('spelling')}
          />
          <ActionBtn
            label="Structuur verbeteren"
            description="Herstructureert alinea's — inhoud blijft hetzelfde."
            loading={loading === 'structure'}
            disabled={!!loading}
            onClick={() => runTextAction('structure')}
          />

          {/* Tekenhulp */}
          <div style={{ marginTop: '4px', borderTop: '1px solid #27272a', paddingTop: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#aaa', fontFamily: 'Georgia, serif', marginBottom: '8px' }}>
              Tekenhulp
            </div>

            {/* Selected sketch preview */}
            {hasSketch ? (
              <div style={{ marginBottom: '8px' }}>
                <img
                  src={selectedDrawing.dataUrl}
                  alt="Geselecteerde schets"
                  style={{ width: '100%', borderRadius: '6px', border: '2px solid #2563EB', display: 'block', objectFit: 'contain', maxHeight: '90px', background: '#fafaf7' }}
                />
                <div style={{ fontSize: '10px', color: '#555', fontFamily: 'Georgia, serif', marginTop: '3px' }}>
                  Schets geselecteerd
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: '#555', fontFamily: 'Georgia, serif', marginBottom: '8px', lineHeight: 1.5 }}>
                Selecteer een tekening via "Selecteer voor AI", of typ een beschrijving hieronder.
              </div>
            )}

            {/* Text input */}
            <textarea
              value={drawInput}
              onChange={e => { setDrawInput(e.target.value); setDrawResult(null) }}
              placeholder={hasSketch
                ? 'Optioneel: instructie voor de schets...'
                : 'Beschrijf wat je wil tekenen...'}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#27272a', border: '1px solid #3f3f46',
                borderRadius: '6px', color: '#f0ede8',
                fontFamily: 'Georgia, serif', fontSize: '12px',
                padding: '8px 10px', resize: 'none', outline: 'none',
                lineHeight: 1.5,
              }}
            />

            {/* Action button */}
            <button
              onClick={runDrawingHelp}
              disabled={!!loading || (!hasSketch && !hasText)}
              style={{
                marginTop: '6px',
                width: '100%',
                padding: '8px 0',
                background: loading === 'tekenhulp' ? '#27272a' : hasSketch ? '#2563EB' : '#E6B400',
                border: 'none',
                borderRadius: '6px',
                cursor: (loading || (!hasSketch && !hasText)) ? 'not-allowed' : 'pointer',
                fontFamily: 'Georgia, serif',
                fontSize: '12px',
                fontWeight: 600,
                color: hasSketch ? '#fff' : '#1a1a1a',
                opacity: (!hasSketch && !hasText) ? 0.4 : 1,
                transition: 'opacity 0.15s, background 0.15s',
              }}
            >
              {btnLabel()}
            </button>

            {/* Text-only result (drawing steps) */}
            {drawResult && (
              <div style={{
                marginTop: '8px',
                padding: '10px',
                background: '#27272a',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#d4d0c8',
                fontFamily: 'Georgia, serif',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {drawResult}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

function ActionBtn({ label, description, loading, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '10px 12px',
        background: '#27272a',
        border: '1px solid #3f3f46',
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s',
        opacity: disabled && !loading ? 0.5 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#3f3f46' }}
      onMouseLeave={e => { e.currentTarget.style.background = '#27272a' }}
    >
      <div style={{ fontSize: '12px', fontWeight: 600, color: loading ? '#E6B400' : '#f0ede8', fontFamily: 'Georgia, serif', marginBottom: '3px' }}>
        {loading ? 'Bezig...' : label}
      </div>
      <div style={{ fontSize: '11px', color: '#666', fontFamily: 'Georgia, serif', lineHeight: 1.4 }}>
        {description}
      </div>
    </button>
  )
}
