export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action, content } = req.body
  if (!action || !content) return res.status(400).json({ error: 'action en content zijn verplicht' })

  const prompts = {
    spelling: `Je bent een Nederlandse spellingcorrector. Corrigeer alle spelfouten in de tekst hieronder. Verander NIETS aan de inhoud, structuur of opmaak — alleen spelfouten. Geef alleen de gecorrigeerde tekst terug, geen uitleg.\n\n${content}`,
    structure: `Je bent een Nederlandse tekstredacteur. Verbeter de structuur en opbouw van de tekst hieronder. Maak alinea's logischer, verbeter overgangen, maar verander de inhoud en betekenis NIET. Schrijf niet voor de gebruiker — alleen herstructureren. Geef alleen de verbeterde tekst terug, geen uitleg.\n\n${content}`,
    drawing: `Je bent een tekenassistent. De gebruiker wil een tekening maken op basis van deze beschrijving: "${content}". Geef een korte, concrete tekenstap-voor-stap instructie in het Nederlands (max 5 stappen). Geen lange uitleg, alleen praktische stappen.`,
  }

  const prompt = prompts[action]
  if (!prompt) return res.status(400).json({ error: 'Onbekende actie' })

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
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
