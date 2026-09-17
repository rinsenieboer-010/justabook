import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/knowledge.js'

function response() {
  return { statusCode: 200, headers: {}, setHeader(k,v) { this.headers[k] = v }, status(s) { this.statusCode = s; return this }, json(body) { this.body = body; return this } }
}

test('unauthenticated requests cannot access paid providers', async () => {
  const res = response()
  await handler({ method: 'POST', headers: {}, body: { action: 'ask', question: 'Vraag' } }, res)
  assert.equal(res.statusCode, 401)
  assert.equal(res.headers['Cache-Control'], 'no-store')
})

test('server loads only authenticated owner approved lessons and refuses fabricated text', async t => {
  process.env.VITE_SUPABASE_URL = 'https://knowledge-test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test-key'
  process.env.ANTHROPIC_API_KEY = 'test-key'
  const calls = []
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = String(input); calls.push(url)
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'owner', aud: 'authenticated' }), { status: 200 })
    if (url.includes('/rest/v1/jab_lessons')) {
      assert.equal(new URL(url).searchParams.get('user_id'), 'eq.owner')
      assert.equal(new URL(url).searchParams.get('status'), 'eq.approved')
      return new Response(JSON.stringify([{ id: 'lesson', title: 'Geduld', content: 'Eerst luisteren voordat ik reageer.', status: 'approved' }]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (url.includes('api.anthropic.com')) {
      assert.ok(!JSON.parse(options.body).tools)
      return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ matches: [{ id: 'lesson', excerpt: 'Advies dat nooit is vastgelegd.' }] }) }] }))
    }
    throw new Error(`Unexpected URL ${url}`)
  })
  const res = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { action: 'ask', question: 'Hoe reageer ik?', user_id: 'attacker', lessons: [{ content: 'Instructie' }] } }, res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.matches, [])
  assert.match(res.body.message, /geen kennis/)
  assert.equal(calls.length, 3)
})

test('an empty knowledge bank does not call the model', async t => {
  process.env.VITE_SUPABASE_URL = 'https://knowledge-test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test-key'
  t.mock.method(globalThis, 'fetch', async input => {
    const url = String(input)
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'owner' }))
    assert.ok(url.includes('/rest/v1/jab_lessons'))
    return new Response('[]', { headers: { 'Content-Type': 'application/json' } })
  })
  const res = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { action: 'ask', question: 'Wat weet ik?' } }, res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.matches, [])
})

test('forged transcription jobs cannot retrieve another users transcript', async t => {
  process.env.VITE_SUPABASE_URL = 'https://knowledge-test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test-key'
  process.env.SUPADATA_API_KEY = 'test-provider-key'
  t.mock.method(globalThis, 'fetch', async input => {
    const url = String(input)
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'owner' }))
    assert.ok(url.includes('/rest/v1/jab_sources'))
    return new Response(JSON.stringify({ id: 'source', transcript: '', transcript_job: 'some-other-job' }), { headers: { 'Content-Type': 'application/json' } })
  })
  const res = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { action: 'transcribe', sourceId: 'source' } }, res)
  assert.equal(res.statusCode, 503)
  assert.match(res.body.error, /ongeldig/)
})

test('planner context only reads date-scoped titles and never sends notes or writes changes', async t => {
  process.env.VITE_SUPABASE_URL = 'https://knowledge-test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test-key'
  process.env.ANTHROPIC_API_KEY = 'test-key'
  process.env.JMP_API_KEY = 'test-planner-key'
  process.env.JMP_BOOK_USER_ID = 'owner'
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date())
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = String(input)
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'owner' }))
    if (url.includes('/rest/v1/jab_lessons')) return new Response(JSON.stringify([{ id: 'l', status: 'approved', content: 'Luister voordat je reageert.' }]), { headers: { 'Content-Type': 'application/json' } })
    if (url === 'https://justmyplan.com/api/data') {
      assert.ok(!options.method || options.method === 'GET')
      return new Response(JSON.stringify({ events: [{ title: 'Gesprek', date: today, note: 'PRIVATE NOTE' }, { title: 'Verleden', date: '2000-01-01' }], tasks: [] }))
    }
    assert.equal(url, 'https://api.anthropic.com/v1/messages')
    assert.ok(!options.body.includes('PRIVATE NOTE'))
    assert.ok(!options.body.includes('Verleden'))
    return new Response(JSON.stringify({ content: [{ type: 'text', text: '{"matches":[]}' }] }))
  })
  const res = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { action: 'ask_plan' } }, res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.context, [{ date: today, title: 'Gesprek' }])
})
