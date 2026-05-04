export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action, content, imageData } = req.body
  if (!action) return res.status(400).json({ error: 'action is verplicht' })

  const headers = {
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  }

  try {
    let requestBody

    if (action === 'refine_sketch') {
      if (!imageData) return res.status(400).json({ error: 'imageData ontbreekt' })
      const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData

      requestBody = {
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: base64 },
            },
            {
              type: 'text',
              text: `Dit is een ruwe schets gemaakt door de gebruiker. Maak er een nette, complete SVG-illustratie van die weergeeft wat in de schets staat getekend.

Regels:
- viewBox="0 0 800 400"
- Gebruik eenvoudige, schone vormen en lijnen
- Witte achtergrond (#fafaf7)
- Houd het herkenbaar maar netjes en afgewerkt
- Geen tekst tenzij duidelijk aanwezig in de schets
- Geef ALLEEN de SVG-code terug, begin direct met <svg, geen uitleg`,
            },
          ],
        }],
      }
    } else {
      if (!content) return res.status(400).json({ error: 'content ontbreekt' })

      const prompts = {
        spelling: `Je bent een Nederlandse spellingcorrector. Corrigeer alle spelfouten in de tekst hieronder. Verander NIETS aan de inhoud, structuur of opmaak — alleen spelfouten. Geef alleen de gecorrigeerde tekst terug, geen uitleg.\n\n${content}`,
        structure: `Je bent een Nederlandse tekstredacteur. Verbeter de structuur en opbouw van de tekst hieronder. Maak alinea's logischer, verbeter overgangen, maar verander de inhoud en betekenis NIET. Schrijf niet voor de gebruiker — alleen herstructureren. Geef alleen de verbeterde tekst terug, geen uitleg.\n\n${content}`,
        drawing: `Je bent een tekenassistent. De gebruiker wil een tekening maken op basis van deze beschrijving: "${content}". Geef een korte, concrete tekenstap-voor-stap instructie in het Nederlands (max 5 stappen). Geen lange uitleg, alleen praktische stappen.`,
      }

      const prompt = prompts[action]
      if (!prompt) return res.status(400).json({ error: 'Onbekende actie' })

      requestBody = {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Claude API fout' })

    res.json({ result: data.content[0].text })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
