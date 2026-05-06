export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action, content, imageData, hint } = req.body
  if (!action) return res.status(400).json({ error: 'action is verplicht' })

  const headers = {
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  }

  try {
    if (action === 'refine_sketch') {
      if (!imageData) return res.status(400).json({ error: 'imageData ontbreekt' })
      const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData

      const styleGuide = hint ? `\n\nStijl: "${hint}". Wees expressief en visueel aantrekkelijk.` : ''

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
              {
                type: 'text',
                text: `Dit is een schets. Maak er een mooie, gedetailleerde SVG-illustratie van.${styleGuide}\n\nRegels:\n- viewBox="0 0 800 400"\n- Zorg voor een mooie achtergrond\n- Maak het zo gedetailleerd en mooi mogelijk\n- Geef ALLEEN de SVG-code terug, begin direct met <svg`,
              },
            ],
          }],
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Claude API fout')
      return res.json({ result: data.content[0].text, type: 'svg' })
    }

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
      headers,
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
