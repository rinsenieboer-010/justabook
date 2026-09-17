import { supabase } from './supabase.js'
import { amsterdamDay } from '../lib/knowledge.js'

async function readAll(table, userId) {
  const rows = []
  for (let from = 0; ; from += 500) {
    const order = table === 'jab_lesson_links' ? 'lesson_id' : table === 'jab_knowledge_preferences' ? 'user_id' : 'id'
    let request = supabase.from(table).select('*').eq('user_id', userId).order(order)
    if (table === 'jab_lesson_links') request = request.order('related_id')
    const { data, error } = await request.range(from, from + 499)
    if (error) return { error }
    rows.push(...data)
    if (data.length < 500) return { data: rows }
  }
}

export async function loadKnowledge(userId) {
  const tables = ['jab_sources', 'jab_lessons', 'jab_lesson_links', 'jab_knowledge_preferences']
  const results = await Promise.all(tables.map(table => readAll(table, userId)))
  if (results.some(r => r.error)) throw new Error('De kennisbank kon niet worden geladen. Controleer je verbinding. Bij de eerste installatie moet de kennisbank-migratie worden uitgevoerd.')
  let preferences = results[3].data[0]
  if (!preferences) {
    const { error } = await supabase.from('jab_knowledge_preferences').upsert({ user_id: userId, interval_days: 7, anchor_date: amsterdamDay() }, { onConflict: 'user_id', ignoreDuplicates: true })
    if (error) throw new Error('De herinneringsvoorkeur kon niet worden opgeslagen. Probeer opnieuw.')
    const result = await supabase.from('jab_knowledge_preferences').select('*').eq('user_id', userId).single()
    if (result.error) throw new Error('De herinneringsvoorkeur kon niet worden geladen.')
    preferences = result.data
  }
  return { sources: results[0].data, lessons: results[1].data, links: results[2].data, preferences }
}

export async function saveKnowledge(table, row, userId) {
  const { data, error } = await supabase.from(table).upsert({ ...row, user_id: userId }).select().single()
  if (error) throw new Error('Opslaan is mislukt. Je invoer staat nog in het formulier. Probeer opnieuw.')
  return data
}

export async function knowledgeAction(body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Log opnieuw in.')
  const response = await fetch('/api/knowledge', {
    method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(65000),
  })
  let data
  try { data = await response.json() } catch { throw new Error('De kennisservice is niet bereikbaar. Probeer later opnieuw.') }
  if (!response.ok) throw new Error(data.error || 'De verwerking is mislukt.')
  return data
}
