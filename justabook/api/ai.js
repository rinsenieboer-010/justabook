function buildStyleGuide(hint) {
  const h = hint.toLowerCase()
  if (h.includes('van gogh') || h.includes('gogh')) {
    return `Stijl: Van Gogh / post-impressionisme.
- Gebruik DIKKE gebogen <path>-stroken (stroke-width 6-14) die draaien en golven, zoals echte penseelstreken
- Levendige, expressieve kleuren: diepblauw (#1a3a6e), geel (#e8c020), oranje (#d4601a), groen (#2d6e2d)
- Bewogen, spiralende lijnen voor lucht en achtergrond (zoals "Sterrennacht")
- Geen vlakke rechthoeken of geometrische vormen — alles in organische penseelvegen
- Donkere omlijning voor figuren, levendige kleurvlakken erbinnen gevuld met diagonale hacheerstrepen`
  }
  if (h.includes('monet') || h.includes('impressioni')) {
    return `Stijl: Impressionisme (Monet).
- Zachte, vage kleurvlekken via kleine <circle> en korte <line> elementen dicht op elkaar
- Pastelkleuren: lichtblauw, lila, zacht groen, roze, crème
- Geen scherpe lijnen — alles gesuggereerd door kleurvlekjes
- Lichteffecten: lichte vlekken in het midden, donkerder aan de randen`
  }
  if (h.includes('picasso') || h.includes('cubis')) {
    return `Stijl: Kubisme (Picasso).
- Breek vormen op in geometrische vlakken: driehoeken, parallellogrammen, trapeziums
- Toon meerdere perspectieven tegelijk (voorkant en zijkant van gezichten/objecten)
- Gedempte kleuren: oker, grijs, bruin, zwart, met een enkel felle accentkleur
- Harde rechte lijnen en hoeken`
  }
  if (h.includes('cartoon') || h.includes('comic') || h.includes('strip')) {
    return `Stijl: Cartoon / comic strip.
- Dikke zwarte omlijning (stroke-width 3-5, stroke="#111")
- Heldere, verzadigde vlakkleuren zonder verloop
- Expressieve, overdreven vormen
- Eventueel kleine actie-details (bewegingslijntjes, sterretjes)`
  }
  if (h.includes('sketch') || h.includes('schets') || h.includes('potlood')) {
    return `Stijl: Potloodschets.
- Dunne grijze lijnen (stroke="#555", stroke-width 1-2)
- Arcering via parallelle lijnen op schaduwdelen
- Ruwe, iets onregelmatige lijnen (gebruik meerdere korte <path>-segmenten)
- Witte/crème achtergrond, geen opvulkleuren`
  }
  return `Stijl gebaseerd op instructie: "${hint}".
- Interpreteer de gewenste stijl zo nauwkeurig mogelijk in SVG
- Gebruik kleuren, lijndikte en vormen die passen bij de stijl
- Wees expressief en visueel aantrekkelijk`
}

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
      const { hint } = req.body
      const hintLine = hint ? `\n\nGebruik deze instructie als leidraad: "${hint}"` : ''

      const styleGuide = hint ? buildStyleGuide(hint) : ''

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
              text: `Dit is een ruwe schets gemaakt door de gebruiker. Maak er een complete SVG-illustratie van.${hintLine}

${styleGuide}

Algemene regels:
- viewBox="0 0 800 400"
- Achtergrond passend bij de stijl
- Houd de compositie herkenbaar als de originele schets
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
