import { useState } from 'react'

const OPTIONS = [
  {
    id: 'spelling',
    label: 'Spellingfouten corrigeren',
    description: 'AI controleert en verbetert spelfouten in de geselecteerde pagina.',
  },
  {
    id: 'drawing',
    label: 'Tekening verfijnen of maken',
    description: 'Beschrijf wat je wil tekenen of laat AI een bestaande tekening verfijnen.',
  },
  {
    id: 'structure',
    label: 'Structuur verbeteren',
    description: 'AI stelt een betere opbouw voor van hoofdstukken en alinea\'s.',
  },
]

export default function AiPanel({ activePageId }) {
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState({ spelling: false, drawing: false, structure: false })

  const toggle = (id) => setEnabled(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      height: '100vh',
      zIndex: 100,
      display: 'flex',
      alignItems: 'stretch',
      pointerEvents: 'none',
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
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{
          width: '220px',
          padding: '28px 18px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          height: '100%',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f0ede8', fontFamily: 'Georgia, serif', marginBottom: '12px', letterSpacing: '0.02em' }}>
            AI-opties
          </div>

          {OPTIONS.map(opt => (
            <label
              key={opt.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: enabled[opt.id] ? '#27272a' : 'transparent',
                border: `1px solid ${enabled[opt.id] ? '#3f3f46' : '#27272a'}`,
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                  border: `2px solid ${enabled[opt.id] ? '#E6B400' : '#555'}`,
                  background: enabled[opt.id] ? '#E6B400' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s, border-color 0.15s',
                }}>
                  {enabled[opt.id] && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3l2.5 2.5L8 1" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <input type="checkbox" checked={enabled[opt.id]} onChange={() => toggle(opt.id)} style={{ display: 'none' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: enabled[opt.id] ? '#f0ede8' : '#aaa', fontFamily: 'Georgia, serif', lineHeight: 1.3 }}>
                  {opt.label}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#666', fontFamily: 'Georgia, serif', lineHeight: 1.5, margin: '0 0 0 24px' }}>
                {opt.description}
              </p>
            </label>
          ))}

          <div style={{
            marginTop: 'auto',
            paddingTop: '20px',
            borderTop: '1px solid #27272a',
            fontSize: '11px',
            color: '#555',
            fontFamily: 'Georgia, serif',
            lineHeight: 1.6,
          }}>
            AI helpt — jij schrijft.<br />
            Geen ideeën genereren of tekst invullen.
          </div>
        </div>
      </div>
    </div>
  )
}
