async function refineWithFal(base64, hint) {
  const prompt = buildFalPrompt(hint)

  const falRes = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${process.env.FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: `data:image/png;base64,${base64}`,
      prompt,
      strength: 0.75,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
    }),
  })

  if (!falRes.ok) {
    const err = await falRes.json().catch(() => ({}))
    throw new Error(err.detail || err.message || `fal.ai HTTP ${falRes.status}`)
  }

  const falData = await falRes.json()
  const imageUrl = falData.images?.[0]?.url
  if (!imageUrl) throw new Error('Geen afbeelding ontvangen van fal.ai')

  const imgRes = await fetch(imageUrl)
  const buffer = await imgRes.arrayBuffer()
  const resultBase64 = Buffer.from(buffer).toString('base64')
  return `data:image/jpeg;base64,${resultBase64}`
}

function buildFalPrompt(hint) {
  if (!hint) return 'artistic illustration, detailed, colorful, high quality painting, no text'
  const h = hint.toLowerCase()
  if (h.includes('van gogh') || h.includes('gogh')) {
    return 'masterpiece oil painting by Vincent van Gogh, iconic post-impressionist style, dramatic swirling turbulent sky with thick impasto spirals, bold expressive curved brushstrokes, intensely saturated colors, cobalt blue and ultramarine swirls, chrome yellow fields, burnt orange accents, museum quality artwork, no text, no watermark'
  }
  if (h.includes('monet') || h.includes('impressioni')) {
    return 'masterpiece impressionist oil painting by Claude Monet, dappled light and shimmering water reflections, loose feathery brushstrokes, soft luminous pastel palette, museum quality, no text, no watermark'
  }
  if (h.includes('picasso') || h.includes('cubis')) {
    return 'masterpiece cubist painting by Pablo Picasso, geometric fragmented shapes from multiple viewpoints, bold blacks and ochres, angular planes, museum quality, no text, no watermark'
  }
  if (h.includes('rembrandt') || h.includes('baroque')) {
    return 'masterpiece baroque oil painting by Rembrandt van Rijn, dramatic chiaroscuro, golden light from darkness, rich jewel-toned shadows, museum quality, no text, no watermark'
  }
  if (h.includes('watercolor') || h.includes('aquarel')) {
    return 'professional watercolor painting, luminous transparent washes, delicate bleeding edges, white paper showing through highlights, no text, no watermark'
  }
  return `masterpiece painting in the style of ${hint}, highly detailed, expressive brushwork, vivid colors, museum quality, no text, no watermark`
}

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action, content, imageData } = req.body
  if (!action) return res.status(400).json({ error: 'action is verplicht' })

  const claudeHeaders = {
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  }

  try {
    if (action === 'refine_sketch') {
      if (!imageData) return res.status(400).json({ error: 'imageData ontbreekt' })

      if (!process.env.FAL_KEY) {
        return res.status(500).json({ error: 'FAL_KEY niet ingesteld in Vercel' })
      }

      const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData
      const { hint } = req.body

      const dataUrl = await refineWithFal(base64, hint)
      return res.json({ result: dataUrl, type: 'image' })
    }

    // Tekst-acties
    if (!content) return res.status(400).json({ error: 'content ontbreekt' })

    const prompts = {
      spelling: `Je bent een Nederlandse spellingcorrector. Corrigeer alle spelfouten in de tekst hieronder. Verander NIETS aan de inhoud, structuur of opmaak. Geef alleen de gecorrigeerde tekst terug.\n\n${content}`,
      structure: `Je bent een Nederlandse tekstredacteur. Verbeter de structuur en opbouw van de tekst hieronder. Verander de inhoud en betekenis NIET. Geef alleen de verbeterde tekst terug.\n\n${content}`,
      drawing: `Je bent een tekenassistent. De gebruiker wil een tekening maken: "${content}". Geef een korte, concrete tekenstap-voor-stap instructie in het Nederlands (max 5 stappen).`,
    }

    const prompt = prompts[action]
    if (!prompt) return res.status(400).json({ error: 'Onbekende actie' })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: claudeHeaders,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Claude API fout' })

    res.json({ result: data.content[0].text })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
