const knex     = require('../database/index');
const scryfall = require('../utils/scryfall');
const { Groq } = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Color filtering helper ───────────────────────────────────────────────────
function matchesColorFilter(cardCI, filterStr) {
  if (!filterStr || filterStr === '&colorIdentity=') return true;
  const filterColors = new Set(filterStr.replace('&colorIdentity=', '').split(', ').filter(Boolean));
  if (filterColors.size === 0) return true;
  const cardColors = new Set((cardCI || '').split(', ').filter(Boolean));
  if (cardColors.size === 0) return true; // colorless always matches
  return [...cardColors].every(c => filterColors.has(c));
}

// ── Build color filter string from array ─────────────────────────────────────
function buildColorFilterString(selectedColors) {
  if (!selectedColors || selectedColors.length === 0) return '';
  return selectedColors.sort().join(', ');
}

// ── Validate deck response from Groq ─────────────────────────────────────────
function validateDeckResponse(response, filteredCollection) {
  const collectionMap = new Map(filteredCollection.map(c => [c.name.toLowerCase(), c]));
  const invalid = [];
  const valid = [];

  for (const entry of [...response.mainboard, ...response.sideboard]) {
    const owned = collectionMap.get(entry.name.toLowerCase());
    const isBasicLand = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'].includes(entry.name);
    
    if (!owned) {
      invalid.push({ name: entry.name, qty: entry.qty, reason: 'Not found in collection' });
    } else if (entry.qty > owned.qty) {
      invalid.push({ 
        name: entry.name, 
        qty: entry.qty, 
        reason: `Only ${owned.qty} copies in collection` 
      });
    } else {
      valid.push({ ...entry, card_id: owned.card_id });
    }
  }

  return { valid, invalid };
}

// ── Extract JSON from Groq response (handles surrounding text) ───────────────
function extractJsonFromResponse(text) {
  const match = text.match(/{[\s\S]*}/);
  if (!match) throw new Error('No JSON found in response');
  return JSON.parse(match[0]);
}

module.exports = {
  async buildDeck(req, res) {
    const now           = new Date();
    const formattedDate = `\x1b[33m${now.toISOString()}\x1b[0m`;
    const { deckId, selectedColors, isCommander } = req.body;
    const user_id       = req.userId;

    if (!deckId) {
      return res.status(400).json({ error: 'No deck selected' });
    }

    try {
      // ── Step 1: Fetch ALL user collection rows (no pagination) ──────────────
      const allDbRows = await knex('collection')
        .select('card_id', 'id_collection')
        .count('id_collection as countById')
        .where('user_id', user_id)
        .groupBy('card_id', 'id_collection');

      if (!allDbRows.length) {
        return res.status(400).json({ error: 'Collection is empty' });
      }

      // ── Step 2: Fetch Scryfall data for all cards ────────────────────────────
      const allScryfallIds = allDbRows.map(r => r.card_id);
      const allScryfallCards = await scryfall.batchGetCards(allScryfallIds);
      const cardMap = new Map(allScryfallCards.map(c => [c.id, c]));

      // ── Step 3: Merge collection with Scryfall data ────────────────────────
      let fullCollection = allDbRows
        .map(row => {
          const cardData = cardMap.get(row.card_id);
          if (!cardData) return null;
          return {
            card_id: row.card_id,
            name: cardData.name,
            colorIdentity: cardData.colorIdentity,
            manaValue: cardData.manaValue,
            types: cardData.types,
            supertypes: cardData.supertypes,
            qty: parseInt(row.countById, 10),
          };
        })
        .filter(Boolean);

      // ── Step 4: Filter by selected colors ──────────────────────────────────
      const colorFilterStr = buildColorFilterString(selectedColors);
      let filteredCollection = fullCollection.filter(c =>
        matchesColorFilter(c.colorIdentity, colorFilterStr)
      );

      if (!filteredCollection.length) {
        return res.status(400).json({ error: 'No cards match the selected colors' });
      }

      // ── Step 5: Fetch current deck cards (for context) ────────────────────
      const currentDeckRows = await knex('deck')
        .select(
          'collection.card_id',
          'deck.sideboard',
          knex.raw('MIN(collection.id_collection) as id_collection'),
          knex.raw('COUNT(deck.id_card) as countById')
        )
        .join('collection', 'collection.id_collection', '=', 'deck.id_card')
        .where('deck.user_id', user_id)
        .where('deck.deck', deckId)
        .groupBy('collection.card_id', 'deck.sideboard');

      const currentDeckCards = currentDeckRows.map(row => ({
        card_id: row.card_id,
        name: cardMap.get(row.card_id)?.name || 'Unknown',
        qty: parseInt(row.countById, 10),
      }));

      // ── Step 6: Build Groq prompt ──────────────────────────────────────────
      const format = isCommander ? 'Commander' : 'Modern';
      const targetSize = isCommander ? 100 : 60;
      const copyLimit = isCommander ? 1 : 4;
      const selectedColorsStr = selectedColors.length > 0 ? selectedColors.join(', ') : 'any';

      const prompt = `Você é um deckbuilder experiente de Magic: The Gathering, especializado no formato ${format}.

${currentDeckCards.length > 0 ? `O usuário já tem algumas cartas no deck:
${JSON.stringify(currentDeckCards, null, 2)}

Você pode manter essas cartas como base e adicionar novas para completar o deck.` : 'O deck está vazio. Você precisa construir do zero.'}

Monte o melhor deck possível de ${format} usando APENAS cartas da lista de coleção abaixo (JSON).

Regras obrigatórias:
- NUNCA sugira uma carta que não esteja na lista fornecida.
- NUNCA sugira quantidade maior que o campo "qty" de cada carta.
- O deck deve ter exatamente ${targetSize} cartas (incluindo terrenos), formato ${format}, cores: ${selectedColorsStr}.
- Max ${copyLimit} cópia(s) de qualquer carta não-terreno.
- Priorize curva de mana saudável, sinergias entre as cartas disponíveis, e proporção adequada de terrenos (~16-18, ajuste conforme a curva).
- Se houver muito poucas cartas na coleção filtrada, use as melhores disponíveis mesmo que não preencha todas as sinergias ideais.
- Explique brevemente (2-3 frases) a estratégia geral do deck.
- Depois, liste um sideboard sugerido (até 15 cartas) só com o que sobrou na coleção filtrada, se fizer sentido.

Retorne a resposta EXCLUSIVAMENTE em JSON, no seguinte formato, sem texto fora do JSON:

{
  "strategy": "string",
  "mainboard": [{ "name": "string", "qty": number }],
  "sideboard": [{ "name": "string", "qty": number }],
  "landCount": number
}

Coleção disponível (após filtro de cor):
${JSON.stringify(filteredCollection, null, 2)}`;

      // ── Step 7: Call Groq ──────────────────────────────────────────────────
      console.log(`[AI] Calling Groq for deck ${deckId}, format ${format}, colors [${selectedColorsStr}]`);
      
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.1-8b-instant',
        temperature: 1,
        max_completion_tokens: 4096,
        top_p: 1,
        stream: false,
      });

      const responseText = chatCompletion.choices[0]?.message?.content || '';
      console.log(`[AI] Groq response received (length: ${responseText.length})`);

      // ── Step 8: Extract and parse JSON ──────────────────────────────────────
      let deckResponse;
      try {
        deckResponse = extractJsonFromResponse(responseText);
      } catch (err) {
        console.error(`[AI] JSON extraction failed:`, err.message);
        return res.status(500).json({ error: 'Failed to parse deck response from AI' });
      }

      // ── Step 9: Validate response ──────────────────────────────────────────
      const { valid, invalid } = validateDeckResponse(deckResponse, filteredCollection);

      // Separate mainboard and sideboard from valid
      const validMainboard = valid.filter(c => 
        deckResponse.mainboard.some(m => m.name.toLowerCase() === c.name.toLowerCase())
      );
      const validSideboard = valid.filter(c =>
        deckResponse.sideboard && deckResponse.sideboard.some(s => s.name.toLowerCase() === c.name.toLowerCase())
      );

      console.log(`[AI] Validation: ${valid.length} valid, ${invalid.length} invalid cards`);

      // ── Step 10: Return result ──────────────────────────────────────────────
      return res.json({
        strategy: deckResponse.strategy || 'No strategy provided',
        mainboard: validMainboard,
        sideboard: validSideboard,
        landCount: deckResponse.landCount || 0,
        skippedCards: invalid,
      });

    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
      return res.status(500).json({ 
        error: error.message || 'Failed to build deck with AI' 
      });
    }
  },
};
