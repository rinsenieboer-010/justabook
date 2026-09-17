import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)('playwright')
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' })
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } })
page.setDefaultTimeout(10000)
const failures = []
page.on('pageerror', e => failures.push(e.message))
const uid = 'f49d0485-3a25-43c8-bcda-6dce4afccf37'
const db = {
  jab_books: [{ id: 'book', user_id: uid, title: 'Mijn boek', sort_order: 0 }],
  jab_pages: [{ id: 'page', book_id: 'book', user_id: uid, title: 'Mijn hoofdstuk', type: 'hoofdstuk', items: [{ id: 'text', type: 'text', content: 'Mijn bestaande boektekst blijft hier.' }], sort_order: 0 }],
  jab_sources: [], jab_lessons: [], jab_lesson_links: [],
  jab_knowledge_preferences: [{ user_id: uid, interval_days: 7, anchor_date: '2026-09-14' }],
}
await page.addInitScript(({ uid }) => {
  localStorage.setItem('sb-knowledge-test-auth-token', JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh', expires_at: Math.floor(Date.now()/1000)+3600, token_type: 'bearer', user: { id: uid, email: 'test@example.com', aud: 'authenticated' } }))
}, { uid })
await page.route('https://knowledge-test.supabase.co/**', async route => {
  const request = route.request()
  const url = new URL(request.url())
  let result
  if (url.pathname.includes('/auth/')) result = { id: uid, email: 'test@example.com' }
  else {
    const table = url.pathname.split('/').pop()
    if (!db[table]) throw new Error(`Unexpected table: ${table}`)
    if (request.method() === 'POST') {
      const row = request.postDataJSON()
      const key = row.id ? 'id' : 'user_id'
      db[table] = [...db[table].filter(r => r[key] !== row[key]), row]
      result = row
    } else result = db[table]
    if (request.headers().accept?.includes('vnd.pgrst.object') && Array.isArray(result)) result = result[0] || null
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) })
})
await page.route('**/api/knowledge', async route => {
  const body = route.request().postDataJSON()
  const result = body.action === 'draft' ? { title: 'Ruimte voor een gesprek', content: 'Luister eerst voordat je reageert.' } : { matches: [], message: 'Ik vind in jouw goedgekeurde lessen geen kennis die deze vraag beantwoordt.' }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) })
})

try {
  await page.goto(process.env.KNOWLEDGE_PREVIEW_URL || 'http://127.0.0.1:4319')
  await page.getByRole('button', { name: 'Mijn kennis ↗' }).click()
  await page.getByLabel('Titel', { exact: true }).fill('Podcast over geduld')
  await page.getByLabel('Link naar video of podcast').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  const transcript = 'Eerst luisteren voordat je reageert. Neem de tijd om te begrijpen wat de ander bedoelt.'
  await page.getByLabel('Transcript', { exact: true }).fill(transcript)
  await page.getByRole('button', { name: 'Bron opslaan', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Bron opgeslagen.' }).waitFor()
  console.log('Source saved')
  await page.getByLabel('Transcript', { exact: true }).click()
  await page.getByLabel('Transcript', { exact: true }).press('ControlOrMeta+A')
  await page.getByRole('button', { name: 'Help me met een concept' }).click()
  await page.getByLabel('Wat heb ik geleerd?').waitFor()
  console.log('Draft ready')
  assert.equal(await page.getByLabel('Wat heb ik geleerd?').inputValue(), 'Luister eerst voordat je reageert.')
  await page.getByLabel('Wat heb ik geleerd?').fill('Ik merk dat een lastig gesprek beter gaat wanneer ik eerst luister en daarna pas reageer.')
  await page.getByLabel('Mijn korte herinnering').fill('Eerst begrijpen. Dan reageren.')
  await page.getByRole('button', { name: 'Bewaar als concept' }).click()
  await page.getByRole('status').filter({ hasText: 'Concept opgeslagen.' }).waitFor()
  console.log('Draft saved')
  assert.equal(db.jab_lessons[0].status, 'draft')
  await page.getByRole('button', { name: '03 Terughalen' }).click()
  await page.getByText('Geef een goedgekeurde les een korte herinnering.').waitFor()
  await page.getByRole('button', { name: '02 Mijn lessen' }).click()
  await page.getByRole('button', { name: 'Dit is mijn kennis', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Opgeslagen als jouw kennis.' }).waitFor()
  console.log('Lesson approved')
  await page.getByRole('button', { name: '03 Terughalen' }).click()
  await page.getByText('“Eerst begrijpen. Dan reageren.”').waitFor()
  await page.getByLabel('Mijn vraag of situatie').fill('Wat weet ik over sterrenkunde?')
  await page.getByRole('button', { name: 'Zoek in mijn kennis', exact: true }).click()
  await page.getByText('Ik vind in jouw goedgekeurde lessen geen kennis die deze vraag beantwoordt.').waitFor()
  await mkdir('artifacts', { recursive: true })
  await page.locator('.knowledge').evaluate(el => { el.scrollTop = 0 })
  await page.screenshot({ path: 'artifacts/knowledge-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.knowledge').evaluate(el => { el.scrollTop = 0 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await page.screenshot({ path: 'artifacts/knowledge-mobile.png', fullPage: true })
  await page.reload()
  await page.getByRole('button', { name: 'Mijn kennis ↗' }).click()
  await page.getByRole('button', { name: '03 Terughalen' }).click()
  await page.getByText('“Eerst begrijpen. Dan reageren.”').waitFor()
  await page.getByRole('button', { name: 'Terug naar mijn boek' }).click()
  assert.equal(db.jab_pages[0].items[0].content, 'Mijn bestaande boektekst blijft hier.')
  assert.equal(db.jab_sources[0].transcript, transcript)
  assert.equal(db.jab_lessons[0].status, 'approved')
  assert.deepEqual(failures, [])
  console.log('UI passed: source, fragment, draft, rewrite, approval, reminder, refusal, reload, mobile, untouched book.')
} catch (error) {
  console.error('UI failure:', error.message, failures)
  await mkdir('artifacts', { recursive: true })
  await page.screenshot({ path: 'artifacts/knowledge-failure.png' })
  throw error
} finally { await browser.close() }
