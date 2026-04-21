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
  const { data } = await supabase
    .from('jab_books')
    .insert({
      id: book.id,
      user_id: userId,
      title: book.title,
      sort_order: 0,
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
      sort_order: sortOrder,
      created_at_display: page.createdAt,
    })
    .select()
    .single()
  return data ? dbToPage(data) : page
}

export async function updatePageDB(page) {
  await supabase
    .from('jab_pages')
    .update({
      title: page.title,
      type: page.type,
      items: page.items,
      drawing: page.drawing,
    })
    .eq('id', page.id)
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
  }
}
