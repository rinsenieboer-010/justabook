import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { knowledgeAction, loadKnowledge, saveKnowledge } from '../knowledge-store.js'
import { amsterdamDay, reminderFor, safeLink } from '../../lib/knowledge.js'
import './KnowledgeWorkspace.css'

const blankSource = () => ({ id: crypto.randomUUID(), title: '', url: '', transcript: '', audio_path: null })
const blankLesson = () => ({ id: crypto.randomUUID(), title: '', content: '', quote: '', tags: '', status: 'draft', source_id: null, excerpt: '', location: '' })

export default function KnowledgeWorkspace({ userId, books, onClose }) {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('sources')
  const [source, setSource] = useState(blankSource)
  const [lesson, setLesson] = useState(blankLesson)
  const [selection, setSelection] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [relatedId, setRelatedId] = useState('')
  const [linkNote, setLinkNote] = useState('')
  const [day, setDay] = useState(amsterdamDay)
  const [sourceDirty, setSourceDirty] = useState(false)
  const [lessonDirty, setLessonDirty] = useState(false)

  useEffect(() => {
    let active = true
    loadKnowledge(userId).then(value => { if (active) setData(value) }).catch(e => { if (active) setError(e.message) })
    const timer = setInterval(() => setDay(amsterdamDay()), 60000)
    return () => { active = false; clearInterval(timer) }
  }, [userId])

  useEffect(() => {
    const beforeUnload = e => { if (sourceDirty || lessonDirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [sourceDirty, lessonDirty])

  async function run(fn) {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { await fn() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  function updateSource(patch) { setSource(s => ({ ...s, ...patch })); setSourceDirty(true) }
  function updateLesson(patch) { setLesson(l => ({ ...l, ...patch })); setLessonDirty(true) }
  const discard = dirty => !dirty || window.confirm('Je hebt niet-opgeslagen wijzigingen. Wil je die verlaten?')
  function chooseSource(value) {
    if (!discard(sourceDirty)) return
    setSource(value); setSelection(''); setSourceDirty(false)
  }
  function chooseLesson(value) {
    if (!discard(lessonDirty)) return
    setLesson(value); setLessonDirty(false); setTab('lessons'); setRelatedId(''); setLinkNote('')
  }
  function replaceRow(key, row) {
    setData(d => ({ ...d, [key]: [...d[key].filter(r => r.id !== row.id), row] }))
  }
  async function persistSource() {
    if (!source.title.trim()) throw new Error('Geef je bron een titel.')
    if (source.url && !safeLink(source.url)) throw new Error('Gebruik een volledige https-link.')
    const { id, title, url, transcript, audio_path } = source
    const row = await saveKnowledge('jab_sources', { id, title, url, transcript, audio_path }, userId)
    replaceRow('sources', row); setSource(row); setSourceDirty(false)
    return row
  }
  async function saveLesson(status) {
    if (!lesson.title.trim() || !lesson.content.trim()) throw new Error('Vul een titel en je les in.')
    const row = await saveKnowledge('jab_lessons', { ...lesson, status }, userId)
    replaceRow('lessons', row); setLesson(row); setLessonDirty(false); setAnswer(null)
    setNotice(status === 'approved' ? 'Opgeslagen als jouw kennis. Deze les mag nu terugkomen in antwoorden en herinneringen.' : 'Concept opgeslagen. Dit wordt nog niet gebruikt in antwoorden of herinneringen.')
  }
  async function draft(useAI) {
    if (!selection.trim()) throw new Error('Selecteer eerst een stukje uit het transcript.')
    if (!discard(lessonDirty)) return
    const saved = await persistSource()
    const result = useAI ? await knowledgeAction({ action: 'draft', sourceId: saved.id, excerpt: selection }) : { title: source.title, content: selection }
    setLesson({ ...blankLesson(), ...result, source_id: saved.id, excerpt: selection })
    setLessonDirty(true); setTab('lessons')
  }
  async function transcribe() {
    const saved = await persistSource()
    const result = await knowledgeAction({ action: 'transcribe', sourceId: saved.id })
    const fresh = await loadKnowledge(userId)
    setData(fresh); setSource(fresh.sources.find(s => s.id === saved.id) || saved)
    setNotice(result.pending ? 'Je transcript wordt verwerkt. Gebruik straks “Transcript ophalen” om het resultaat op te halen. Je kunt dit scherm tussendoor sluiten.' : result.message || 'Transcript opgeslagen. Selecteer nu het fragment dat je wilt bewaren.')
  }
  async function uploadAudio(file) {
    if (!file) return
    if (file.size > 200 * 1024 * 1024) throw new Error('Gebruik een audiobestand van maximaal 200 MB.')
    if (source.audio_path) throw new Error('Maak een nieuwe bron voor een ander audiobestand.')
    await persistSource()
    const ext = file.name.split('.').pop().toLowerCase()
    const mime = { mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', webm: 'audio/webm', mp4: 'video/mp4' }[ext]
    if (!mime) throw new Error('Gebruik mp3, m4a, wav, ogg, webm of mp4.')
    const path = `${userId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('jab-audio').upload(path, file, { contentType: mime })
    if (error) throw new Error('Audio uploaden is mislukt. Controleer je verbinding en de opslagconfiguratie.')
    try {
      const { id, title, url, transcript } = source
      const saved = await saveKnowledge('jab_sources', { id, title, url, transcript, audio_path: path }, userId)
      replaceRow('sources', saved); setSource(saved); setSourceDirty(false)
    } catch (e) { await supabase.storage.from('jab-audio').remove([path]); throw e }
    setNotice('Audiobestand opgeslagen. Klik op Transcript ophalen om het om te zetten naar tekst.')
  }
  async function importText(file) {
    if (!file) return
    if (file.size > 1000000) throw new Error('Gebruik een tekstbestand van maximaal 1 MB.')
    const text = await file.text()
    if (text.length > 500000) throw new Error('Het transcript mag maximaal 500.000 tekens bevatten.')
    updateSource({ transcript: text }); setSelection('')
  }

  const lessons = data?.lessons || []
  const quote = reminderFor(lessons, data?.preferences || { interval_days: 7, anchor_date: day }, day)
  const lessonSource = data?.sources.find(s => s.id === lesson.source_id)
  const linked = data?.links.filter(l => l.lesson_id === lesson.id || l.related_id === lesson.id) || []
  const existingLesson = lessons.some(l => l.id === lesson.id)

  return <main className="knowledge">
    <header className="knowledge-header">
      <div><span className="knowledge-eyebrow">justabook / Persoonlijke kennis</span><h1>Wat ik wil onthouden.</h1><p>Verzamelen, in eigen woorden begrijpen en weer terughalen.</p></div>
      <button disabled={busy} onClick={() => { if (discard(sourceDirty || lessonDirty)) onClose() }}>Terug naar mijn boek</button>
    </header>
    <nav className="knowledge-tabs" aria-label="Kennisbank">
      {[['sources', '01', 'Bronnen'], ['lessons', '02', 'Mijn lessen'], ['recall', '03', 'Terughalen']].map(([id, n, title]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><small>{n}</small> {title}</button>)}
    </nav>
    {error && <p className="knowledge-error" role="alert">{error}{!data && <button onClick={() => run(async () => setData(await loadKnowledge(userId)))}>Opnieuw laden</button>}</p>}
    {notice && <p className="knowledge-notice" role="status">{notice}</p>}
    {!data ? <p>Je kennisbank laden…</p> : <fieldset className="knowledge-body" disabled={busy}>
      {busy && <p role="status" className="knowledge-working">Bezig met verwerken…</p>}
      {tab === 'sources' && <div className="knowledge-grid">
        <aside className="knowledge-list"><h2>Mijn bronnen</h2><p>Video’s, podcasts en losse aantekeningen.</p><button onClick={() => chooseSource(blankSource())}>+ Nieuwe bron</button>
          {data.sources.length === 0 && <p className="knowledge-empty">Bewaar je eerste bron. De les die jij eruit haalt komt hierna.</p>}
          {data.sources.map(s => <button key={s.id} className={s.id === source.id ? 'selected' : ''} onClick={() => chooseSource(s)}>{s.title}<small>{s.transcript ? 'Transcript beschikbaar' : s.audio_path ? 'Audio toegevoegd' : 'Bron bewaard'}</small></button>)}
        </aside>
        <section className="knowledge-card"><h2>Een bron voor later</h2><p>Het bronmateriaal blijft apart van wat je zelf schrijft.</p>
          <label>Titel<input maxLength={250} value={source.title} onChange={e => updateSource({ title: e.target.value })} placeholder="Bijvoorbeeld: gesprek over gewoontes" /></label>
          <label>Link naar video of podcast<input type="url" maxLength={2000} value={source.url} onChange={e => updateSource({ url: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" /></label>
          <div className="knowledge-actions"><button onClick={() => run(async () => { await persistSource(); setNotice('Bron opgeslagen.') })}>Bron opslaan</button>{safeLink(source.url) && <a href={safeLink(source.url)} target="_blank" rel="noreferrer">Bron openen ↗</a>}
            <button onClick={() => run(transcribe)} disabled={!!source.transcript}>Transcript ophalen</button></div>
          <details><summary>Audio of een transcriptbestand toevoegen</summary><p>Een YouTube-link kan rechtstreeks worden omgezet. Gebruik voor Spotify een transcript of eigen audiobestand. Audio wordt voor transcriptie naar de transcriptiedienst gestuurd.</p>
            <label>Audiobestand (max. 200 MB)<input type="file" accept=".mp3,.m4a,.wav,.ogg,.webm,.mp4" onChange={e => { const f = e.target.files[0]; e.target.value = ''; run(() => uploadAudio(f)) }} /></label>
            <label>Transcriptbestand (.txt, .srt, .vtt)<input type="file" accept=".txt,.srt,.vtt" onChange={e => { const f = e.target.files[0]; e.target.value = ''; run(() => importText(f)) }} /></label>
          </details>
          {source.audio_path && <p className="knowledge-meta">Audiobestand gekoppeld aan deze bron.</p>}
          <label>Transcript<textarea aria-label="Transcript" rows={14} maxLength={500000} value={source.transcript} onChange={e => { updateSource({ transcript: e.target.value }); setSelection('') }} onSelect={e => setSelection(e.target.value.slice(e.target.selectionStart, e.target.selectionEnd))} placeholder="Plak een transcript, importeer een bestand of haal het op met de knop hierboven. Selecteer daarna een fragment." /></label>
          <div className="knowledge-selection"><small>GEKOZEN FRAGMENT · {selection.length} TEKENS</small><p>{selection || 'Selecteer de zinnen waar je een les uit wilt halen.'}</p></div>
          <div className="knowledge-actions"><button disabled={!selection.trim()} onClick={() => run(() => draft(false))}>Zelf een les uitwerken</button><button disabled={selection.trim().length < 20} onClick={() => run(() => draft(true))}>Help me met een concept</button></div>
        </section>
      </div>}
      {tab === 'lessons' && <div className="knowledge-grid">
        <aside className="knowledge-list"><h2>Mijn lessen</h2><button onClick={() => chooseLesson(blankLesson())}>+ Eigen les schrijven</button><label>Zoek in je lessen<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Onderwerp, woord of les" /></label>
          {lessons.filter(l => `${l.title} ${l.content} ${l.tags}`.toLowerCase().includes(query.toLowerCase())).map(l => <button key={l.id} className={l.id === lesson.id ? 'selected' : ''} onClick={() => chooseLesson(l)}>{l.title}<small>{l.status === 'approved' ? 'Mijn kennis' : 'Concept'}</small></button>)}
          <details><summary>Een pagina uit mijn boek gebruiken</summary><p>Kies een pagina om als conceptles uit te werken.</p>{books.map(b => <div key={b.id}><strong>{b.title}</strong>{b.pages.map(p => <button key={p.id} onClick={() => {
            if (!discard(lessonDirty)) return
            const text = p.items.filter(i => i.type === 'text').map(i => i.content).join('\n\n')
            if (text.length > 12000) { setError('Deze pagina is te lang voor één les. Kopieer het relevante fragment naar een nieuwe les.'); return }
            setLesson({ ...blankLesson(), title: p.title, content: text, location: `${b.title} / ${p.title}`.slice(0,250) }); setLessonDirty(true)
          }}>{p.title}</button>)}</div>)}</details>
        </aside>
        <section className="knowledge-card"><span className="knowledge-eyebrow">{lesson.status === 'approved' ? 'Mijn kennis' : 'Concept / nog niet mijn kennis'}</span><h2>In mijn eigen woorden</h2>
          <label>Titel<input value={lesson.title} maxLength={250} onChange={e => updateLesson({ title: e.target.value })} /></label>
          <label>Wat heb ik geleerd?<textarea aria-label="Wat heb ik geleerd?" rows={9} value={lesson.content} maxLength={12000} onChange={e => updateLesson({ content: e.target.value })} placeholder="Wat betekent dit voor mij? Wanneer heb ik dit zelf meegemaakt?" /></label>
          <label>Mijn korte herinnering<textarea aria-label="Mijn korte herinnering" rows={3} value={lesson.quote} maxLength={1200} onChange={e => updateLesson({ quote: e.target.value })} placeholder="Schrijf de zin die je later aan jezelf wilt teruggeven." /></label>
          <label>Onderwerpen<input value={lesson.tags} maxLength={500} onChange={e => updateLesson({ tags: e.target.value })} placeholder="Bijvoorbeeld: werk, geduld, keuzes" /></label>
          <label>Tijdcode of plek in mijn boek<input value={lesson.location} maxLength={250} onChange={e => updateLesson({ location: e.target.value })} placeholder="Bijvoorbeeld: 12:30 tot 14:10" /></label>
          {lesson.excerpt && <details><summary>Oorspronkelijk fragment{lessonSource ? `: ${lessonSource.title}` : ''}</summary><blockquote>{lesson.excerpt}</blockquote>{safeLink(lessonSource?.url) && <a href={safeLink(lessonSource.url)} target="_blank" rel="noreferrer">Open bron ↗</a>}</details>}
          <div className="knowledge-actions"><button onClick={() => run(() => saveLesson('draft'))}>Bewaar als concept</button><button className="knowledge-primary" onClick={() => run(() => saveLesson('approved'))}>{lesson.status === 'approved' ? 'Mijn kennis bijwerken' : 'Dit is mijn kennis'}</button></div>
          <p className="knowledge-meta">Alleen goedgekeurde lessen worden gebruikt voor antwoorden en herinneringen. Je kunt een les altijd terugzetten naar concept.</p>
          {existingLesson && <div className="knowledge-relations"><h3>Verbanden met andere lessen</h3>{linked.map(link => {
            const other = lessons.find(l => l.id === (link.lesson_id === lesson.id ? link.related_id : link.lesson_id))
            return <div key={`${link.lesson_id}-${link.related_id}`}><button onClick={() => chooseLesson(other)}>{other?.title}</button><p>{link.note}</p><button onClick={() => run(async () => {
              const { error } = await supabase.from('jab_lesson_links').delete().eq('user_id', userId).eq('lesson_id', link.lesson_id).eq('related_id', link.related_id)
              if (error) throw new Error('Het verband kon niet worden verwijderd.')
              setData(d => ({ ...d, links: d.links.filter(l => l !== link) }))
            })}>Verband verwijderen</button></div>
          })}
            <label>Verbind met<select value={relatedId} onChange={e => setRelatedId(e.target.value)}><option value="">Kies een les</option>{lessons.filter(l => l.id !== lesson.id).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
            <label>Hoe horen ze bij elkaar?<textarea rows={2} maxLength={2000} value={linkNote} onChange={e => setLinkNote(e.target.value)} /></label>
            <button disabled={!relatedId} onClick={() => run(async () => {
              const [first, second] = [lesson.id, relatedId].sort()
              const row = await saveKnowledge('jab_lesson_links', { lesson_id: first, related_id: second, note: linkNote }, userId)
              setData(d => ({ ...d, links: [...d.links.filter(l => !(l.lesson_id === first && l.related_id === second)), row] })); setRelatedId(''); setLinkNote(''); setNotice('Verband opgeslagen.')
            })}>Verband bewaren</button>
          </div>}
        </section>
      </div>}
      {tab === 'recall' && <div className="knowledge-recall">
        <section className="knowledge-quote"><span className="knowledge-eyebrow">Een herinnering aan mezelf</span>{quote ? <><blockquote>“{quote.quote}”</blockquote><button onClick={() => chooseLesson(quote)}>{quote.title} ↗</button></> : <p>{data.preferences?.interval_days === 0 ? 'Je herinneringen staan uit.' : 'Geef een goedgekeurde les een korte herinnering. Die komt hier terug.'}</p>}
          <label>Hoe vaak een andere herinnering?<select value={data.preferences?.interval_days ?? 7} onChange={e => { const interval = Number(e.target.value); run(async () => {
            const preferences = await saveKnowledge('jab_knowledge_preferences', { interval_days: interval, anchor_date: day }, userId)
            setData(d => ({ ...d, preferences })); setNotice('Voorkeur opgeslagen.')
          }) }}><option value={0}>Uit</option><option value={1}>Dagelijks</option><option value={2}>Om de twee dagen</option><option value={3}>Om de drie dagen</option><option value={7}>Wekelijks</option></select></label>
          <p className="knowledge-meta">Deze herinnering verschijnt hier in je boek. Meldingen en de koppeling met Just My Plan zijn nog niet actief.</p>
        </section>
        <section className="knowledge-card"><span className="knowledge-eyebrow">Alleen uit mijn eigen kennis</span><h2>Wat heb ik hier al over geleerd?</h2><p>Beschrijf een vraag of situatie. Je krijgt letterlijke passages uit je goedgekeurde lessen, met de les erbij. Als er niets aansluit, zegt de assistent dat.</p>
          <form onSubmit={e => { e.preventDefault(); setAnswer(null); run(async () => setAnswer(await knowledgeAction({ action: 'ask', question }))) }}><label>Mijn vraag of situatie<textarea aria-label="Mijn vraag of situatie" rows={4} value={question} maxLength={2000} onChange={e => setQuestion(e.target.value)} placeholder="Ik stel een lastig gesprek uit. Welke eigen les kan me helpen?" /></label><button className="knowledge-primary" disabled={!question.trim()}>Zoek in mijn kennis</button></form>
          <details><summary>Een les bij mijn komende week</summary><p>Als de koppeling is ingesteld, worden alleen de titels van afspraken en taken met een datum in de komende zeven dagen gebruikt. Deze worden voor het zoeken naar passende lessen naar de kennisassistent gestuurd.</p><button onClick={() => { setAnswer(null); run(async () => setAnswer(await knowledgeAction({ action: 'ask_plan' }))) }}>Zoek bij mijn week in Just My Plan</button></details>
          {answer && <div className="knowledge-answer" aria-live="polite"><p>{answer.message}</p>{answer.context?.length > 0 && <details><summary>Gebruikte afspraken en taken</summary><ul>{answer.context.map((c,i) => <li key={i}>{c.date}: {c.title}</li>)}</ul></details>}{answer.matches.map(m => <article key={m.id}><blockquote>{m.excerpt}</blockquote><button onClick={() => chooseLesson(lessons.find(l => l.id === m.id))}>{m.title} ↗</button>{m.location && <small>{m.location}</small>}</article>)}</div>}
        </section>
      </div>}
    </fieldset>}
  </main>
}
