import { useState, useRef, useEffect } from 'react'

export default function Sidebar({
  books, activeBook, pages, activeId,
  onSelect, onSelectBook, onAddBook, onRenameBook, onDeleteBook,
  isOpen, onToggle, userEmail, onSignOut,
}) {
  const [query, setQuery]               = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showBookMenu, setShowBookMenu] = useState(false)
  const [renamingId, setRenamingId]     = useState(null)
  const [renameValue, setRenameValue]   = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { id, title }
  const [addingBook, setAddingBook]     = useState(false)
  const [newBookName, setNewBookName]   = useState('')
  const bookMenuRef                     = useRef(null)
  const newBookInputRef                 = useRef(null)

  // Close book menu when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (bookMenuRef.current && !bookMenuRef.current.contains(e.target)) {
        setShowBookMenu(false)
        setRenamingId(null)
        setAddingBook(false)
        setNewBookName('')
      }
    }
    if (showBookMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBookMenu])

  const pageText = (p) => (p.items || []).filter(i => i.type === 'text').map(i => i.content).join(' ')

  const filtered = query.trim() === ''
    ? pages.map((p, idx) => ({ ...p, idx }))
    : pages
        .map((p, idx) => ({ ...p, idx }))
        .filter(p =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          pageText(p).toLowerCase().includes(query.toLowerCase())
        )

  const startRename = (book, e) => {
    e.stopPropagation()
    setRenamingId(book.id)
    setRenameValue(book.title)
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameBook(renamingId, renameValue.trim())
    }
    setRenamingId(null)
  }

  const startAddBook = () => {
    setNewBookName('')
    setAddingBook(true)
    setTimeout(() => newBookInputRef.current?.focus(), 50)
  }

  const commitAddBook = () => {
    const name = newBookName.trim()
    if (name) {
      onAddBook(name)
      setShowBookMenu(false)
    }
    setAddingBook(false)
    setNewBookName('')
  }

  return (
    <>
    <aside style={{
      width: isOpen ? '220px' : '5vw',
      minWidth: isOpen ? '220px' : '5vw',
      background: '#e8e4de',
      borderRight: '1px solid #d5d0c8',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width 0.25s ease, min-width 0.25s ease',
      flexShrink: 0,
      cursor: isOpen ? 'default' : 'pointer',
    }}
      onClick={!isOpen ? onToggle : undefined}
    >
      {isOpen ? (
        <>
          {/* Header */}
          <div style={{
            padding: '20px 16px 10px',
            borderBottom: '1px solid #d5d0c8',
            position: 'relative',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}>
              {/* Book title / selector trigger */}
              <div ref={bookMenuRef} style={{ position: 'relative', flex: 1, minWidth: 0, marginRight: 4 }}>
                <button
                  onClick={() => { setShowBookMenu(v => !v); setRenamingId(null) }}
                  title="Wissel van boek"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 4px 2px 0',
                    borderRadius: 4,
                    maxWidth: '100%',
                  }}
                >
                  <span style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    color: '#1a1a1a',
                    letterSpacing: '-0.3px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '120px',
                  }}>
                    {activeBook?.title ?? 'Mijn boek'}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    color: '#888',
                    lineHeight: 1,
                    transform: showBookMenu ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s',
                  }}>
                    ▼
                  </span>
                </button>

                {/* Book dropdown */}
                {showBookMenu && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    width: '200px',
                    background: '#f0ede8',
                    border: '1px solid #d5d0c8',
                    borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    overflow: 'hidden',
                  }}>
                    {/* Books list */}
                    <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '6px 0' }}>
                      {books.map(book => (
                        <div
                          key={book.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 6px',
                          }}
                        >
                          {renamingId === book.id ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onBlur={commitRename}
                              onKeyDown={e => {
                                if (e.key === 'Enter') commitRename()
                                if (e.key === 'Escape') setRenamingId(null)
                              }}
                              onClick={e => e.stopPropagation()}
                              style={{
                                flex: 1,
                                padding: '5px 8px',
                                margin: '2px 0',
                                border: '1px solid #aaa',
                                borderRadius: 5,
                                background: '#fff',
                                fontFamily: 'Georgia, serif',
                                fontSize: '13px',
                                outline: 'none',
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => { onSelectBook(book.id); setShowBookMenu(false) }}
                              style={{
                                flex: 1,
                                textAlign: 'left',
                                padding: '7px 8px',
                                background: activeBook?.id === book.id ? '#d5d0c8' : 'none',
                                border: 'none',
                                borderRadius: 5,
                                cursor: 'pointer',
                                fontFamily: 'Georgia, serif',
                                fontSize: '13px',
                                fontWeight: activeBook?.id === book.id ? 'bold' : 'normal',
                                color: '#1a1a1a',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              onMouseEnter={e => { if (activeBook?.id !== book.id) e.currentTarget.style.background = '#e0dbd4' }}
                              onMouseLeave={e => { if (activeBook?.id !== book.id) e.currentTarget.style.background = 'none' }}
                            >
                              {book.title}
                            </button>
                          )}
                          {renamingId !== book.id && (
                            <>
                              <button
                                onClick={e => startRename(book, e)}
                                title="Hernoemen"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '11px', padding: '4px 3px', lineHeight: 1, flexShrink: 0 }}
                              >
                                ✎
                              </button>
                              {books.length > 1 && (
                                <button
                                  onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: book.id, title: book.title }); setShowBookMenu(false) }}
                                  title="Verwijderen"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '12px', padding: '4px 3px', lineHeight: 1, flexShrink: 0 }}
                                >
                                  🗑
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Divider + Add book */}
                    <div style={{ borderTop: '1px solid #d5d0c8', padding: '8px 10px' }}>
                      {addingBook ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <input
                            ref={newBookInputRef}
                            value={newBookName}
                            onChange={e => setNewBookName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitAddBook()
                              if (e.key === 'Escape') { setAddingBook(false); setNewBookName('') }
                            }}
                            placeholder="Naam van het boek"
                            style={{ flex: 1, padding: '5px 8px', border: '1px solid #aaa', borderRadius: 5, background: '#fff', fontFamily: 'Georgia, serif', fontSize: '13px', outline: 'none', minWidth: 0 }}
                          />
                          <button
                            onClick={commitAddBook}
                            style={{ background: '#2563EB', border: 'none', borderRadius: 5, color: '#fff', fontSize: '12px', padding: '4px 8px', cursor: 'pointer', flexShrink: 0 }}
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={startAddBook}
                          style={{ width: '100%', textAlign: 'left', padding: '4px 4px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '13px', color: '#555', borderRadius: 4 }}
                          onMouseEnter={e => e.currentTarget.style.background = '#e0dbd4'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          + Nieuw boek
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action icons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                <button
                  onClick={() => setShowSettings(true)}
                  title="Instellingen"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#aaa',
                    fontSize: '14px',
                    padding: '2px 4px',
                    lineHeight: 1,
                  }}
                >
                  ⚙
                </button>
                <button
                  onClick={onToggle}
                  title="Zijbalk sluiten"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#aaa',
                    fontSize: '14px',
                    padding: '2px 4px',
                    lineHeight: 1,
                  }}
                >
                  &#8249;
                </button>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '12px',
                color: '#aaa',
                pointerEvents: 'none',
              }}>
                &#128269;
              </span>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Zoeken..."
                style={{
                  width: '100%',
                  padding: '6px 8px 6px 26px',
                  border: '1px solid #d5d0c8',
                  borderRadius: '5px',
                  background: '#f0ede8',
                  fontFamily: 'Georgia, serif',
                  fontSize: '12px',
                  color: '#1a1a1a',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#aaa'}
                onBlur={e => e.target.style.borderColor = '#d5d0c8'}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: '#aaa',
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {filtered.length === 0 && (
              <div style={{
                padding: '16px',
                fontSize: '12px',
                color: '#aaa',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
              }}>
                Niets gevonden
              </div>
            )}
            {filtered.map(page => (
              <button
                key={page.id}
                onClick={() => {
                  onSelect(page.id)
                  document.getElementById(`page-${page.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: page.type === 'kop2' ? '6px 16px 6px 28px' : '7px 16px',
                  background: activeId === page.id ? '#d5d0c8' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Georgia, serif',
                  fontSize: page.type === 'kop2' ? '12px' : '13px',
                  fontWeight: page.type === 'hoofdstuk' ? 'bold' : 'normal',
                  color: '#1a1a1a',
                  borderLeft: activeId === page.id ? '2px solid #1a1a1a' : '2px solid transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (activeId !== page.id) e.currentTarget.style.background = '#dedad4' }}
                onMouseLeave={e => { if (activeId !== page.id) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {page.idx + 1}. {page.title || '(zonder titel)'}
                </span>
                {query && pageText(page).toLowerCase().includes(query.toLowerCase()) && (
                  <span style={{
                    display: 'block',
                    fontSize: '10px',
                    color: '#888',
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {getSnippet(pageText(page), query)}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #d5d0c8',
            fontSize: '11px',
            color: '#999',
          }}>
            {query
              ? `${filtered.length} van ${pages.length} gevonden`
              : `${pages.length} ${pages.length === 1 ? 'pagina' : "pagina's"}`
            }
          </div>
        </>
      ) : (
        /* Closed state */
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            fontFamily: 'Georgia, serif',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#aaa',
            letterSpacing: '1px',
            userSelect: 'none',
          }}>
            Overzicht
          </span>
        </div>
      )}
    </aside>

    {/* Delete book confirmation modal */}
    {deleteConfirm && (
      <div
        onClick={() => setDeleteConfirm(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ background: '#f0ede8', borderRadius: 14, width: 360, padding: '28px 28px 24px', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', fontFamily: 'Georgia, serif' }}
        >
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 10 }}>
            Boek verwijderen
          </div>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 6, lineHeight: 1.5 }}>
            Weet je zeker dat je <strong>"{deleteConfirm.title}"</strong> wilt verwijderen?
          </div>
          <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 24, lineHeight: 1.5 }}>
            Dit verwijdert alle pagina's en inhoud van dit boek permanent. Dit kan niet ongedaan worden gemaakt.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setDeleteConfirm(null)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #d5d0c8', background: 'none', color: '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Georgia, serif' }}
            >
              Annuleren
            </button>
            <button
              onClick={() => { onDeleteBook(deleteConfirm.id); setDeleteConfirm(null) }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Georgia, serif' }}
            >
              Verwijderen
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Settings modal */}
    {showSettings && (
      <div onClick={() => setShowSettings(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#f0ede8', borderRadius: 14, width: 360, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', fontFamily: 'Georgia, serif' }}>

          {/* Header */}
          <div style={{ padding: '22px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' }}>Instellingen</span>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>

          <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Account */}
            <div>
              <div style={{ fontSize: 10, color: '#999', fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Account</div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>{userEmail}</div>
              <button
                onClick={() => { onSignOut(); setShowSettings(false); }}
                style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: '1px solid #d5d0c8', background: 'none', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Georgia, serif' }}
              >
                Uitloggen
              </button>
            </div>

            {/* Support */}
            <div style={{ borderTop: '1px solid #d5d0c8', paddingTop: 14, display: 'flex', justifyContent: 'center', gap: 20 }}>
              <a href="https://rjnieboer.com/support/justabook" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#aaa', textDecoration: 'none' }}>
                Support
              </a>
            </div>

          </div>
        </div>
      </div>
    )}
    </>
  )
}

function getSnippet(content, query) {
  const idx = content.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return ''
  const start = Math.max(0, idx - 20)
  const end = Math.min(content.length, idx + query.length + 20)
  return (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '')
}
