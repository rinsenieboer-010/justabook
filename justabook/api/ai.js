function buildFalPrompt(hint) {
  if (!hint) return 'artistic illustration, detailed, colorful, high quality painting, no text'
  const h = hint.toLowerCase()
  if (h.includes('van gogh') || h.includes('gogh')) {
    return 'masterpiece oil painting by Vincent van Gogh, iconic post-impressionist style, dramatic swirling turbulent sky with thick impasto spirals, bold expressive curved brushstrokes visible in every inch, intensely saturated colors, cobalt blue and ultramarine swirls, chrome yellow sunflowers and wheat fields, burnt orange and vermillion accents, deep prussian blue shadows, the exact texture and technique of Starry Night and Wheat Field with Crows, paint applied with palette knife, three-dimensional texture, museum quality artwork, award winning, no text, no watermark, no signature'
  }
  if (h.includes('monet') || h.includes('impressioni')) {
    return 'masterpiece impressionist oil painting by Claude Monet, iconic French impressionism, dappled light and shimmering water reflections, loose feathery brushstrokes, soft luminous pastel palette of lavender rose and sage green, haystacks water lilies garden at Giverny atmosphere, museum quality, award winning, no text, no watermark'
  }
  if (h.includes('picasso') || h.includes('cubis')) {
    return 'masterpiece cubist painting by Pablo Picasso, iconic analytical cubism, geometric fragmented shapes from multiple viewpoints simultaneously, bold blacks and ochres, angular planes, revolutionary abstract composition, museum quality, no text, no watermark'
  }
  if (h.includes('rembrandt') || h.includes('baroque')) {
    return 'masterpiece baroque oil painting by Rembrandt van Rijn, iconic dramatic chiaroscuro, single beam of golden light from darkness, rich jewel-toned shadows, masterful impasto highlights, museum quality old master painting, no text, no watermark'
  }
  if (h.includes('watercolor') || h.includes('aquarel')) {
    return 'professional watercolor painting, luminous transparent washes layered over each other, wet-on-wet blooms and granulation, delicate bleeding edges, white paper showing through highlights, award winning illustration, no text, no watermark'
  }
  if (h.includes('cartoon') || h.includes('anime')) {
    return `${hint} style illustration, high quality, clean bold lines, vibrant saturated colors, professional animation quality, no text, no watermark`
  }
  return `masterpiece painting in the style of ${hint}, highly detailed, expressive brushwork, vivid colors, museum quality, award winning fine art, no text, no watermark`
}

function buildSvgStyleGuide(hint) {
  if (!hint) return ''
  const h = hint.toLowerCase()
  if (h.includes('van gogh') || h.includes('gogh')) {
    return `Stijl: Van Gogh. Gebruik DIKKE gebogen <path>-stroken (stroke-width 6-14) die draaien en golven. Levendige kleuren: diepblauw (#1a3a6e), geel (#e8c020), oranje (#d4601a). Spiraalvormige lijnen voor lucht. Geen vlakke vormen.`
  }
  if (h.includes('monet') || h.includes('impressioni')) {
    return `Stijl: Monet. Kleine kleurvlekken via <circle> en korte <line>. Pastelkleuren. Geen scherpe lijnen.`
  }
  return `Stijl: "${hint}". Wees expressief en visueel aantrekkelijk, passend bij de stijl.`
}

async function refineWithFal(base64, hint) {
  const prompt = buildFalPrompt(hint)
  const dataUrl = `data:image/png;base64,${base64}`

  const falRes = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${process.env.FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: dataUrl,
      prompt,
      strength: 0.92,
      num_inference_steps: 12,
      guidance_scale: 7.5,
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

  // Fetch de gegenereerde afbeelding en converteer naar base64
  const imgRes = await fetch(imageUrl)
  const buffer = await imgRes.arrayBuffer()
  const resultBase64 = Buffer.from(buffer).toString('base64')
  return `data:image/jpeg;base64,${resultBase64}`
}

async function refineWithClaude(base64, hint, claudeHeaders) {
  const hintLine = hint ? `\n\nGebruik deze instructie als leidraad: "${hint}"` : ''
  const styleGuide = hint ? buildSvgStyleGuide(hint) : ''

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: claudeHeaders,
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
          {
            type: 'text',
            text: `Dit is een ruwe schets. Maak er een complete SVG-illustratie van.${hintLine}\n\n${styleGuide}\n\nRegels:\n- viewBox="0 0 800 400"\n- Achtergrond passend bij de stijl\n- Geef ALLEEN de SVG-code terug, begin direct met <svg`,
          },
        ],
      }],
    }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Claude API fout')
  return { result: data.content[0].text, type: 'svg' }
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
      const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData
      const { hint } = req.body

      // Probeer fal.ai; val terug op Claude SVG bij fout
      if (process.env.FAL_KEY) {
        try {
          const dataUrl = await refineWithFal(base64, hint)
          return res.json({ result: dataUrl, type: 'image' })
        } catch (falErr) {
          console.error('fal.ai mislukt, fallback naar Claude SVG:', falErr.message)
          // Doorvallen naar Claude SVG fallback
        }
      }

      // Fallback: Claude SVG
      const svgResult = await refineWithClaude(base64, hint, claudeHeaders)
      return res.json(svgResult)
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
