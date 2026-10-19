import { supabase } from './supabase.js'

// ── BOOKS ─────────────────────────────────────────────────────────────────────

export async function loadBooks(userId) {
  const { data: books } = await supabase
    .from('jab_books')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })

  if (!books || books.length === 0) return []

  const { data: pages } = await supabase
    .from('jab_pages')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })

  const pagesByBook = {}
  for (const p of (pages || [])) {
    if (!pagesByBook[p.book_id]) pagesByBook[p.book_id] = []
    pagesByBook[p.book_id].push(dbToPage(p))
  }

  return books.map(b => ({
    id: b.id,
    title: b.title,
    createdAt: b.created_at_display || b.id,
    pages: pagesByBook[b.id] || [],
  }))
}

export async function addBookDB(userId, book) {
  // Nieuw boek achteraan: hoogste sort_order + 1
  const { data: last } = await supabase
    .from('jab_books')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const sortOrder = last && last.length ? (last[0].sort_order ?? 0) + 1 : 0
  const { data } = await supabase
    .from('jab_books')
    .insert({
      id: book.id,
      user_id: userId,
      title: book.title,
      sort_order: sortOrder,
      created_at_display: book.createdAt,
    })
    .select()
    .single()
  return data
}

export async function updateBookDB(book) {
  await supabase
    .from('jab_books')
    .update({ title: book.title })
    .eq('id', book.id)
}

export async function deleteBookDB(id) {
  // Eerst de pagina's, dan het boek (niet afhankelijk van ON DELETE CASCADE)
  const { error } = await supabase.from('jab_pages').delete().eq('book_id', id)
  if (error) return
  await supabase.from('jab_books').delete().eq('id', id)
}

export async function reorderBooksDB(books) {
  await Promise.all(
    books.map((b, i) =>
      supabase.from('jab_books').update({ sort_order: i }).eq('id', b.id)
    )
  )
}

// ── PAGES ─────────────────────────────────────────────────────────────────────

export async function addPageDB(userId, bookId, page, sortOrder = 0) {
  const { data } = await supabase
    .from('jab_pages')
    .insert({
      id: page.id,
      book_id: bookId,
      user_id: userId,
      title: page.title,
      type: page.type,
      items: page.items,
      drawing: page.drawing,
      min_height: page.minHeight || null,
      sort_order: sortOrder,
      created_at_display: page.createdAt,
    })
    .select()
    .single()
  return data ? dbToPage(data) : page
}

export async function updatePageDB(page) {
  const update = {}
  if (page.title   !== undefined) update.title    = page.title
  if (page.type    !== undefined) update.type     = page.type
  if (page.items   !== undefined) update.items    = page.items
  if (page.drawing !== undefined) update.drawing  = page.drawing
  if (page.minHeight !== undefined) update.min_height = page.minHeight

  await supabase.from('jab_pages').update(update).eq('id', page.id)
}

export async function deletePageDB(id) {
  await supabase.from('jab_pages').delete().eq('id', id)
}

export async function reorderPagesDB(pages) {
  await Promise.all(
    pages.map((p, i) =>
      supabase.from('jab_pages').update({ sort_order: i }).eq('id', p.id)
    )
  )
}

function dbToPage(r) {
  return {
    id: r.id,
    title: r.title || '',
    type: r.type || 'hoofdstuk',
    items: r.items || [],
    drawing: r.drawing || null,
    createdAt: r.created_at_display || '',
    minHeight: r.min_height || undefined,
  }
}
