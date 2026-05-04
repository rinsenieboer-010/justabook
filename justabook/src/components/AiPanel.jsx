import { useState } from 'react'

export default function AiPanel({ activePage, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(null) // 'spelling' | 'structure' | 'drawing'
  const [drawInput, setDrawInput] = useState('')
  const [drawResult, setDrawResult] = useState(null)
  const [error, setError] = useState(null)

  const getPageText = () => {
    if (!activePage?.items) return ''
    return activePage.items
      .filter(it => it.type === 'text')
      .map(it => it.content)
      .join('\n---\n')
  }

  const applyTextResult = (result) => {
    if (!activePage) return
    const parts = result.split('\n---\n')
    const textItems = activePage.items.filter(it => it.type === 'text')
    const otherItems = activePage.items.filter(it => it.type !== 'text')

    const updatedTextItems = textItems.map((item, i) => ({
      ...item,
      content: parts[i] ?? item.content,
    }))

    // Rebuild items in original order, replacing text items with updated ones
    let textIdx = 0
    const newItems = activePage.items.map(it =>
      it.type === 'text' ? updatedTextItems[textIdx++] : it
    )
    onUpdate(activePage.id, 'items', newItems)
  }

  const runAction = async (action) => {
    if (!activePage) return
    setError(null)
    setLoading(action)

    const content = action === 'drawing' ? drawInput : getPageText()
    if (!content.trim()) { setLoading(null); return }

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (action === 'drawing') {
        setDrawResult(data.result)
      } else {
        applyTextResult(data.result)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
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
        }}>
          AI
        </span>
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

          <ActionBtn
            label="Spellingfouten corrigeren"
            description="Corrigeert spelfouten in de actieve pagina zonder de inhoud te veranderen."
            loading={loading === 'spelling'}
            disabled={!!loading}
            onClick={() => runAction('spelling')}
          />

          <ActionBtn
            label="Structuur verbeteren"
            description="Herstructureert alinea's en overgangen — inhoud blijft hetzelfde."
            loading={loading === 'structure'}
            disabled={!!loading}
            onClick={() => runAction('structure')}
          />

          {/* Tekening sectie */}
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#aaa', fontFamily: 'Georgia, serif', marginBottom: '6px' }}>
              Tekening maken
            </div>
            <textarea
              value={drawInput}
              onChange={e => { setDrawInput(e.target.value); setDrawResult(null) }}
              placeholder="Beschrijf wat je wil tekenen..."
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
            <button
              onClick={() => runAction('drawing')}
              disabled={!!loading || !drawInput.trim()}
              style={{
                marginTop: '6px',
                width: '100%',
                padding: '8px 0',
                background: loading === 'drawing' ? '#27272a' : '#E6B400',
                border: 'none',
                borderRadius: '6px',
                cursor: loading || !drawInput.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'Georgia, serif',
                fontSize: '12px',
                fontWeight: 600,
                color: '#1a1a1a',
                opacity: !drawInput.trim() ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {loading === 'drawing' ? 'Bezig...' : 'Tekenstappen genereren'}
            </button>
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

          <div style={{
            marginTop: 'auto',
            paddingTop: '16px',
            borderTop: '1px solid #27272a',
            fontSize: '11px',
            color: '#555',
            fontFamily: 'Georgia, serif',
            lineHeight: 1.6,
          }}>
            AI helpt — jij schrijft.<br />
            Geen ideeën genereren.
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
        background: loading ? '#27272a' : '#27272a',
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
