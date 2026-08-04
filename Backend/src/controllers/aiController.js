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

// ── Check if a card is a land ──────────────────────────────────────────────
function isLand(card) {
  return card.types && card.types.includes('Land');
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

      // ── Step 4b: Remove all lands from AI prompt (player chooses lands) ──────
      const nonLandCards = filteredCollection.filter(c => !isLand(c));

      console.log(`[AI] Filtering: ${fullCollection.length} total → ${filteredCollection.length} after color filter → ${nonLandCards.length} non-land cards`);

      if (!nonLandCards.length) {
        return res.status(400).json({ error: 'No non-land cards match the selected colors' });
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
      const targetNonLandSize = isCommander ? 98 : 36;
      const copyLimit = isCommander ? 1 : 4;
      const selectedColorsStr = selectedColors.length > 0 ? selectedColors.join(', ') : 'any';

      // Calculate current deck size (non-land cards only) and remaining slots
      const currentDeckNonLands = currentDeckCards.filter(c => !isLand(cardMap.get(c.card_id)));
      const currentDeckNonLandSize = currentDeckNonLands.reduce((sum, c) => sum + c.qty, 0);
      const remainingSlots = Math.max(0, targetNonLandSize - currentDeckNonLandSize);

      // Card names with quantities only (non-lands only)
      const cardNamesList = nonLandCards.map(c => `${c.name} (${c.qty})`).join(', ');

      const prompt = `You are an expert Magic: The Gathering ${format} deckbuilder.

OBJECTIVE: Suggest EXACTLY ${remainingSlots} new non-land card(s) to complete the deck.

CURRENT DECK STATE:
- Non-land cards in deck: ${currentDeckNonLandSize}
- Target non-land cards: ${targetNonLandSize}
- Remaining non-land cards needed: ${remainingSlots}

${currentDeckNonLands.length > 0 ? `Cards already in deck: ${currentDeckNonLands.map(c => `${c.name}(${c.qty})`).join(', ')}` : 'Deck is empty.'}

STRICT RULES - YOU MUST FOLLOW ALL:
1. Suggest ONLY ${remainingSlots} card(s) total (mainboard + sideboard combined)
2. You can ONLY use cards from the available list below
3. For EACH card, you must use the EXACT quantity shown in parentheses - NO MORE, NO LESS
4. NEVER suggest a card that is NOT in the available list
5. NEVER suggest more than the available quantity for any card
6. NEVER suggest cards already in the deck (unless adding more copies up to ${copyLimit} total)
7. Max ${copyLimit} copies of any non-basic card
8. Colors: ${selectedColorsStr}
9. DO NOT INCLUDE LANDS - the player will choose lands separately

AVAILABLE CARDS (name (qty)):
${cardNamesList}

RESPONSE FORMAT - ONLY JSON, NO OTHER TEXT:
{"strategy":"brief description of strategy","mainboard":[{"name":"card name","qty":number}],"sideboard":[{"name":"card name","qty":number}]}`;

      // ── Step 7: Call Groq ──────────────────────────────────────────────────
      console.log(`[AI] Calling Groq for deck ${deckId}, format ${format}, colors [${selectedColorsStr}]`);
      console.log(`[AI] Target: ${remainingSlots} non-land cards, ${nonLandCards.length} available`);
      
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
      console.log(`[AI] Raw response:\n${responseText.substring(0, 500)}...`); // First 500 chars

      // ── Step 8: Extract and parse JSON ──────────────────────────────────────
      let deckResponse;
      try {
        deckResponse = extractJsonFromResponse(responseText);
        console.log(`[AI] Parsed deck: ${deckResponse.mainboard?.length || 0} mainboard, ${deckResponse.sideboard?.length || 0} sideboard`);
      } catch (err) {
        console.error(`[AI] JSON extraction failed:`, err.message);
        return res.status(500).json({ error: 'Failed to parse deck response from AI' });
      }

      // ── Step 9: Validate response - MUST be exactly remainingSlots valid cards ────────
      const collectionMap = new Map(nonLandCards.map(c => [c.name.toLowerCase(), c]));
      const validMainboard = [];
      const validSideboard = [];
      const validationErrors = [];

      // Validate mainboard
      for (const card of (deckResponse.mainboard || [])) {
        const owned = collectionMap.get(card.name.toLowerCase());
        if (!owned) {
          validationErrors.push(`Mainboard: "${card.name}" not in available collection`);
        } else if (card.qty !== owned.qty) {
          validationErrors.push(`Mainboard: "${card.name}" - requested ${card.qty} but only ${owned.qty} available`);
        } else {
          validMainboard.push({ ...card, card_id: owned.card_id });
        }
      }

      // Validate sideboard
      for (const card of (deckResponse.sideboard || [])) {
        const owned = collectionMap.get(card.name.toLowerCase());
        if (!owned) {
          validationErrors.push(`Sideboard: "${card.name}" not in available collection`);
        } else if (card.qty !== owned.qty) {
          validationErrors.push(`Sideboard: "${card.name}" - requested ${card.qty} but only ${owned.qty} available`);
        } else {
          validSideboard.push({ ...card, card_id: owned.card_id });
        }
      }

      const totalCards = validMainboard.reduce((sum, c) => sum + c.qty, 0) + validSideboard.reduce((sum, c) => sum + c.qty, 0);
      console.log(`[AI] Validation complete: ${totalCards} valid cards out of ${remainingSlots} needed`);
      if (validationErrors.length > 0) {
        console.log(`[AI] Validation errors (showing first 10):`);
        validationErrors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
      }
      console.log(`[AI] Context: current deck ${currentDeckNonLandSize}/${targetNonLandSize}, remaining ${remainingSlots}, available non-lands ${nonLandCards.length}`);

      // ── Step 10: Return result ────────────────────────────────────────────
      return res.json({
        strategy: deckResponse.strategy || 'No strategy provided',
        mainboard: validMainboard,
        sideboard: validSideboard,
      });

    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
      return res.status(500).json({ 
        error: error.message || 'Failed to build deck with AI' 
      });
    }
  },

  async applyDeck(req, res) {
    const { deckId, mainboard, sideboard } = req.body;
    const user_id = req.userId;

    if (!deckId || !Array.isArray(mainboard)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    try {
      console.log(`[AI] Applying deck ${deckId}: ${mainboard.length} mainboard, ${sideboard?.length || 0} sideboard`);
      
      // ── Collect only the NEW cards to insert (mainboard + sideboard) ───────
      const cardsToInsert = [];

      // Mainboard cards
      for (const card of mainboard) {
        const collectionRows = await knex('collection')
          .select('id_collection')
          .where('user_id', user_id)
          .where('card_id', card.card_id)
          .limit(card.qty);

        if (collectionRows.length > 0) {
          console.log(`[AI]   Mainboard: "${card.name}" (${card.qty} requested, ${collectionRows.length} inserted)`);
        } else {
          console.warn(`[AI]   Mainboard: "${card.name}" - NO PHYSICAL COPIES FOUND!`);
        }

        for (const row of collectionRows) {
          cardsToInsert.push({
            user_id,
            deck: deckId,
            id_card: row.id_collection,
            sideboard: 0,
          });
        }
      }

      // Sideboard cards
      for (const card of (sideboard || [])) {
        const collectionRows = await knex('collection')
          .select('id_collection')
          .where('user_id', user_id)
          .where('card_id', card.card_id)
          .limit(card.qty);

        if (collectionRows.length > 0) {
          console.log(`[AI]   Sideboard: "${card.name}" (${card.qty} requested, ${collectionRows.length} inserted)`);
        } else {
          console.warn(`[AI]   Sideboard: "${card.name}" - NO PHYSICAL COPIES FOUND!`);
        }

        for (const row of collectionRows) {
          cardsToInsert.push({
            user_id,
            deck: deckId,
            id_card: row.id_collection,
            sideboard: 1,
          });
        }
      }

      // ── Insert all NEW cards in one operation (existing cards remain) ──────
      if (cardsToInsert.length > 0) {
        await knex('deck').insert(cardsToInsert);
        console.log(`[AI] Inserted ${cardsToInsert.length} cards into deck ${deckId}`);
      } else {
        console.warn(`[AI] WARNING: No cards were inserted!`);
      }

      return res.json({
        success: true,
        cardsAdded: cardsToInsert.length,
      });

    } catch (error) {
      console.error(`[AI] Apply deck failed:`, error);
      return res.status(500).json({ 
        error: error.message || 'Failed to apply deck' 
      });
    }
  },
};
