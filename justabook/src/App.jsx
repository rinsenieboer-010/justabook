import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import { supabase } from './supabase'
import {
  loadBooks as loadBooksDB,
  addBookDB, updateBookDB, deleteBookDB,
  addPageDB, updatePageDB, deletePageDB, reorderPagesDB,
} from './db.js'

import './App.css'

const newTextItem = (content = '') => ({
  id: crypto.randomUUID(),
  type: 'text',
  content,
})

export const createPage = (title = 'Hoofdstuk', type = 'hoofdstuk') => ({
  id: crypto.randomUUID(),
  title,
  type,
  items: [newTextItem()],
  drawing: null,
  createdAt: new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric', year: '2-digit' }),
})

export const createBook = (title = 'Mijn boek') => ({
  id: crypto.randomUUID(),
  title,
  pages: [createPage()],
  createdAt: new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric', year: '2-digit' }),
})

const createHandyBook = () => ({
  id: crypto.randomUUID(),
  title: 'Handy',
  createdAt: new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric', year: '2-digit' }),
  pages: [
    {
      id: crypto.randomUUID(),
      title: 'Claude Design',
      type: 'hoofdstuk',
      drawing: null,
      createdAt: '21/4/26',
      items: [{ id: crypto.randomUUID(), type: 'text', content: 'Claude Design (Anthropic Labs) is een tool om designs, prototypes, slides en one-pagers te maken via gesprekken met Claude.\n\n• Aangedreven door Claude Opus 4.7 (vision)\n• Beschrijf wat je wil → Claude bouwt de eerste versie\n• Verfijnen via: gesprek, inline comments, directe edits, of custom sliders\n• Export naar: Canva, PDF, of PPTX — of doorgeven aan Claude Code\n• Leest je codebase en design files om een design system op te bouwen\n• Beschikbaar in research preview op Pro, Max, Team en Enterprise plans\n\n⚠️ Claude Design is zwaar op usage. Zie het volgende hoofdstuk.' }],
    },
    {
      id: crypto.randomUUID(),
      title: 'Claude Usage Laag Houden — 7 Tips',
      type: 'kop2',
      drawing: null,
      createdAt: '21/4/26',
      items: [{ id: crypto.randomUUID(), type: 'text', content: 'Bron: Ashley Couto (LinkedIn)\n\n1/ Genereer tekst NIET in Claude Design\nGebruik Haiku of Sonnet, niet Opus 4.7. Eén infographic kost ~44% van je daglijmiet.\n\n2/ Stop met Sonnet & Opus gebruiken zonder reden\nHaiku is krachtiger dan je denkt. Laat Opus voor de zware taken.\n\n3/ MCP-servers zijn geen Pokémon — vang ze niet allemaal\nInactieve servers kosten duizenden tokens, ook als je ze niet gebruikt.\n\n4/ Plannen in Opus, uitvoeren in Sonnet\nSonnet is licht en krachtig. Bewaar Opus voor de echt betekenisvolle taken.\n\n5/ Schrijf specifieke prompts die direct naar bestanden wijzen\nExploratief gedrag (Claude laten rondsnuffelen) vreet usage.\n\n6/ Zet redeneer-modus standaard UIT\nDe meeste prompts zijn niet diep genoeg voor reasoning.\n\n7/ Edits in Claude Design: gebruik manual input & comments\nGebruik de linkerzijbalk zo min mogelijk — die crawlt door het hele document.' }],
    },
    {
      id: crypto.randomUUID(),
      title: 'Seedance AI — Prompt Formula voor Productvideo\'s',
      type: 'hoofdstuk',
      drawing: null,
      createdAt: '21/4/26',
      items: [{ id: crypto.randomUUID(), type: 'text', content: 'Seedance.ai maakt korte productvideo\'s van een stilstaand productfoto.\n\nStap 1: Maak of gebruik een productfoto\nGenereer via Nano Banana, of gebruik je eigen foto.\n\nStap 2: Typ je prompt in dit formaat:\n\n1. Subject — Wat zit er in de shot. Wees specifiek: product, vorm, materiaal, kleur, omgeving.\n\n2. Action — Wat er gebeurt. Beschrijf de beweging concreet, geen sfeer.\n\n3. Camera — Hoe de camera beweegt. Gebruik één camera-move per shot.\n\n4. Style — Hoe het eruit moet zien: belichting, kleurgrading, filmreferentie.\n\n5. Constraints — Wat consistent moet blijven:\n→ avoid jitter\n→ avoid flicker\n→ maintain product consistency\n→ keep the product centered\n\nExtra tips:\n→ Gebruik referentieafbeeldingen om de productidentiteit te vergrendelen\n→ Voeg tijdcodes toe per shot voor betere pacing\n→ Verander één variabele per iteratie' }],
    },
    {
      id: crypto.randomUUID(),
      title: 'Tip Links',
      type: 'kop2',
      drawing: null,
      createdAt: '21/4/26',
      items: [{ id: crypto.randomUUID(), type: 'text', content: 'Claude Usage Tips — Ashley Couto\nhttps://lnkd.in/en-PBJA2 — Hoe Ashley Claude Design tot nu toe gebruikt\nhttps://lnkd.in/e_JaZAh2 — Gratis Maven training: van gebruiker naar native operator\n\nSeedance AI Prompt Formula\nhttps://how-to-ai.guide — Volledige prompt library + meer guides voor AI video' }],
    },
  ],
})

const loadBooks = () => {
  try {
    const saved = localStorage.getItem('justabook_books')
    if (saved) return JSON.parse(saved)
  } catch {}
  return [createBook(), createHandyBook()]
}

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────
function LoginPage() {
  const [mode, setMode]         = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(null)
  const [loading, setLoading]   = useState(false)

  const handleEmail = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) setError(error.message)
      else setSuccess('Check je e-mail voor de resetlink.')
    }
    setLoading(false)
  }

  const switchMode = (m) => { setMode(m); setError(null); setSuccess(null) }

  const handleOAuth = async (provider) => {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.href.split('#')[0].split('?')[0] }
    })
    if (error) setError(error.message)
  }

  const providers = [
    { id: 'google', label: 'Google',    icon: 'G' },
    { id: 'azure',  label: 'Microsoft', icon: 'M' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#111827', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:40 }}>
        <span style={{ fontSize:22, fontWeight:700, color:'#f9fafb', letterSpacing:0.5 }}>justabook</span>
        <div style={{ display:'flex', gap:5 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#DC2626' }} />
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#E6B400' }} />
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#2563EB' }} />
        </div>
      </div>

      {/* Card */}
      <div style={{ background:'#18181b', borderRadius:16, padding:'36px 40px', width:'100%', maxWidth:400, boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
        <h2 style={{ color:'#f9fafb', fontSize:20, fontWeight:700, marginBottom:24, textAlign:'center' }}>
          {mode === 'login' ? 'Inloggen' : mode === 'signup' ? 'Account aanmaken' : 'Wachtwoord vergeten'}
        </h2>

        {mode !== 'forgot' && <>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
            {providers.map(p => (
              <button key={p.id} onClick={() => handleOAuth(p.id)}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'11px 0', borderRadius:8, border:'1px solid #3f3f46', background:'#27272a', color:'#f9fafb', fontSize:14, fontWeight:500, cursor:'pointer', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='#3f3f46'}
                onMouseLeave={e => e.currentTarget.style.background='#27272a'}>
                <span style={{ fontWeight:700, fontSize:15 }}>{p.icon}</span> Doorgaan met {p.label}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
            <div style={{ flex:1, height:1, background:'#3f3f46' }} />
            <span style={{ color:'#71717a', fontSize:12 }}>of</span>
            <div style={{ flex:1, height:1, background:'#3f3f46' }} />
          </div>
        </>}

        <form onSubmit={handleEmail} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input type="email" placeholder="E-mailadres" value={email} onChange={e => setEmail(e.target.value)} required
            style={{ padding:'10px 14px', borderRadius:8, border:'1px solid #3f3f46', background:'#27272a', color:'#f9fafb', fontSize:14, outline:'none' }} />
          {mode !== 'forgot' && (
            <input type="password" placeholder="Wachtwoord (min. 6 tekens)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              style={{ padding:'10px 14px', borderRadius:8, border:'1px solid #3f3f46', background:'#27272a', color:'#f9fafb', fontSize:14, outline:'none' }} />
          )}
          {mode === 'login' && (
            <div style={{ textAlign:'right', marginTop:-4 }}>
              <span onClick={() => switchMode('forgot')} style={{ color:'#60a5fa', fontSize:12, cursor:'pointer' }}>
                Wachtwoord vergeten?
              </span>
            </div>
          )}
          {error && <div style={{ color:'#FCA5A5', fontSize:13 }}>{error}</div>}
          {success && <div style={{ color:'#86efac', fontSize:13 }}>{success}</div>}
          {!success && (
            <button type="submit" disabled={loading}
              style={{ padding:'11px 0', borderRadius:8, border:'none', background:'#2563EB', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', opacity: loading ? 0.7 : 1, transition:'opacity 0.15s' }}>
              {loading ? 'Laden...' : mode === 'login' ? 'Inloggen' : mode === 'signup' ? 'Account aanmaken' : 'Resetlink sturen'}
            </button>
          )}
        </form>

        <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#71717a' }}>
          {mode === 'forgot' ? (
            <span onClick={() => switchMode('login')} style={{ color:'#60a5fa', cursor:'pointer', fontWeight:500 }}>Terug naar inloggen</span>
          ) : mode === 'login' ? <>
            Nog geen account?{' '}
            <span onClick={() => switchMode('signup')} style={{ color:'#60a5fa', cursor:'pointer', fontWeight:500 }}>Aanmaken</span>
          </> : <>
            Al een account?{' '}
            <span onClick={() => switchMode('login')} style={{ color:'#60a5fa', cursor:'pointer', fontWeight:500 }}>Inloggen</span>
          </>}
        </div>
      </div>
    </div>
  )
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession]           = useState(undefined)
  const [books, setBooks]               = useState([])
  const [activeBookId, setActiveBookId] = useState(null)
  const [activePageId, setActivePageId] = useState(null)
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [loading, setLoading]           = useState(false)

  // Debounce timers for page content updates
  const updateTimers = useRef({})

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    return () => subscription.unsubscribe()
  }, [])

  // Load books from Supabase when user logs in
  useEffect(() => {
    if (!session) { setBooks([]); return }
    setLoading(true)
    loadBooksDB(session.user.id).then(loaded => {
      if (loaded.length === 0) {
        // New user — create a default book
        const book = createBook('Mijn eerste boek')
        setBooks([book])
        addBookDB(session.user.id, book).then(() => {
          const [firstPage] = book.pages
          addPageDB(session.user.id, book.id, firstPage, 0)
        })
      } else {
        setBooks(loaded)
      }
      setLoading(false)
    })
  }, [session?.user?.id])

  // Ensure activeBookId is always valid
  useEffect(() => {
    if (books.length > 0 && (!activeBookId || !books.find(b => b.id === activeBookId))) {
      setActiveBookId(books[0].id)
      setActivePageId(null)
    }
  }, [books, activeBookId])

  const activeBook = books.find(b => b.id === activeBookId) ?? books[0]
  const pages = activeBook?.pages ?? []

  // ── Book operations ──
  const addBook = (title = 'Nieuw boek') => {
    const book = createBook(title)
    setBooks(prev => [...prev, book])
    setActiveBookId(book.id)
    setActivePageId(null)
    addBookDB(session.user.id, book).then(() => {
      const [firstPage] = book.pages
      addPageDB(session.user.id, book.id, firstPage, 0)
    })
  }

  const updateBookTitle = (id, title) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, title } : b))
    updateBookDB({ id, title })
  }

  const deleteBook = (id) => {
    if (books.length <= 1) return
    const remaining = books.filter(b => b.id !== id)
    setBooks(remaining)
    if (activeBookId === id) {
      setActiveBookId(remaining[0].id)
      setActivePageId(null)
    }
    deleteBookDB(id)
  }

  const selectBook = (id) => {
    setActiveBookId(id)
    setActivePageId(null)
  }

  // ── Page operations (scoped to active book) ──
  const updateBookPages = useCallback((bookId, updater) => {
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, pages: updater(b.pages) } : b))
  }, [])

  const addPage = (afterId = null, type = 'hoofdstuk') => {
    const newPage = createPage(type === 'kop2' ? 'Kop 2' : 'Hoofdstuk', type)
    let sortOrder = 0
    updateBookPages(activeBook.id, pages => {
      if (!afterId) {
        sortOrder = pages.length
        return [...pages, newPage]
      }
      const idx = pages.findIndex(p => p.id === afterId)
      sortOrder = idx + 1
      const next = [...pages]
      next.splice(idx + 1, 0, newPage)
      return next
    })
    setActivePageId(newPage.id)
    addPageDB(session.user.id, activeBook.id, newPage, sortOrder)
  }

  const updatePage = (id, field, value) => {
    updateBookPages(activeBook.id, pages =>
      pages.map(p => p.id === id ? { ...p, [field]: value } : p)
    )
    // Debounce content updates (text typing), immediately sync structural changes
    if (field === 'items') {
      clearTimeout(updateTimers.current[id])
      updateTimers.current[id] = setTimeout(() => {
        updatePageDB({ id, [field]: value })
      }, 800)
    } else {
      updatePageDB({ id, [field]: value })
    }
  }

  const deletePage = (id) => {
    updateBookPages(activeBook.id, pages =>
      pages.length === 1 ? pages : pages.filter(p => p.id !== id)
    )
    deletePageDB(id)
  }

  const reorderPages = (newPages) => {
    updateBookPages(activeBook.id, () => newPages)
    reorderPagesDB(newPages)
  }

  if (session === undefined) return null
  if (!session) return <LoginPage />
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#f0ede8', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Georgia, serif', color:'#999', fontSize:14 }}>
      Laden...
    </div>
  )

  return (
    <div className="app">
      <Sidebar
        books={books}
        activeBook={activeBook}
        pages={pages}
        activeId={activePageId}
        onSelect={setActivePageId}
        onSelectBook={selectBook}
        onAddBook={addBook}
        onRenameBook={updateBookTitle}
        onDeleteBook={deleteBook}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        userEmail={session.user.email}
        onSignOut={() => supabase.auth.signOut()}
      />
      <Editor
        pages={pages}
        activeId={activePageId}
        onSelect={setActivePageId}
        onUpdate={updatePage}
        onAdd={addPage}
        onDelete={deletePage}
        onReorder={reorderPages}
      />
    </div>
  )
}
