export const NO_MATCH = 'Ik vind in jouw goedgekeurde lessen geen kennis die deze vraag beantwoordt.'

export function youtubeUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    const host = url.hostname.toLowerCase()
    const id = host === 'youtu.be' ? url.pathname.slice(1) :
      ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host) ?
        (url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)$/)?.[1]) : null
    return /^[\w-]{11}$/.test(id || '') ? `https://www.youtube.com/watch?v=${id}` : null
  } catch { return null }
}

export function safeLink(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null } catch { return null }
}

// Only database-owned text can cross the answer boundary; model prose is discarded.
export function groundedMatches(output, lessons) {
  if (!Array.isArray(output?.matches)) return []
  const seen = new Set()
  return output.matches.slice(0, 5).flatMap(match => {
    if (!match || typeof match !== 'object') return []
    const lesson = lessons.find(l => l.id === match.id && l.status === 'approved')
    if (!lesson || seen.has(lesson.id) || typeof match.excerpt !== 'string' || match.excerpt.trim().length < 12 || !lesson.content.includes(match.excerpt)) return []
    seen.add(lesson.id)
    return [{ id: lesson.id, title: lesson.title, excerpt: match.excerpt, source_id: lesson.source_id, location: lesson.location }]
  })
}

export function reminderFor(lessons, preferences, day) {
  if (!preferences?.interval_days) return null
  const list = lessons.filter(l => l.status === 'approved' && l.quote?.trim()).sort((a,b) => a.id.localeCompare(b.id))
  if (!list.length) return null
  const delta = Math.floor((Date.parse(day) - Date.parse(preferences.anchor_date)) / 86400000)
  if (!Number.isFinite(delta) || delta < 0) return null
  return list[Math.floor(delta / preferences.interval_days) % list.length]
}

export function amsterdamDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function transcriptText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) throw new Error('De transcriptiedienst gaf geen tekst terug.')
  return content.map(c => {
    const seconds = Math.max(0, Math.floor(Number(c.offset || 0) / 1000))
    return `[${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}] ${c.text || ''}`
  }).join('\n')
}
