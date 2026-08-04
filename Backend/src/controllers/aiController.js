const knex     = require('../database/index');
const scryfall = require('../utils/scryfall');
const { Groq } = require('groq-sdk');
const { getModernPrompt, getCommanderPrompt, getCommanderPromptWithoutCommander } = require('../services/aiPrompts');

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

// ── Check if card colors match commander color identity ──────────────────
function matchesCommanderColorIdentity(cardColorIdentity, commanderColorIdentity) {
  if (!commanderColorIdentity || commanderColorIdentity === 'colorless') {
    // Only colorless cards allowed
    return !cardColorIdentity || cardColorIdentity === '' || cardColorIdentity.split(', ').length === 0;
  }
  
  const allowedColors = new Set(commanderColorIdentity.split(', ').filter(Boolean));
  const cardColors = new Set((cardColorIdentity || '').split(', ').filter(Boolean));
  
  // All card colors must be in the allowed colors (or colorless)
  return [...cardColors].every(c => allowedColors.has(c));
}

// ── Check if card is a basic land ──────────────────────────────────────────
function isBasicLand(cardName) {
  const basicLands = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']);
  return basicLands.has(cardName);
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
      const targetNonLandSize = isCommander ? 60 : 36;
      const copyLimit = isCommander ? 1 : 4;
      const selectedColorsStr = selectedColors.length > 0 ? selectedColors.join(', ') : 'any';

      // Calculate current deck size (non-land cards only) and remaining slots
      const currentDeckNonLands = currentDeckCards.filter(c => !isLand(cardMap.get(c.card_id)));
      const currentDeckNonLandSize = currentDeckNonLands.reduce((sum, c) => sum + c.qty, 0);
      const remainingSlots = Math.max(0, targetNonLandSize - currentDeckNonLandSize);

      // Card names with quantities only (non-lands only)
      const cardNamesList = nonLandCards.map(c => `${c.name} (${c.qty})`).join(', ');

      // Build prompt based on format
      let prompt;
      let commanderColorIdentity = '';
      let commanderName = '';
      let hasCommander = false;

      if (isCommander) {
        // Fetch commander data for Commander format
        const commanderRows = await knex('deck')
          .select('collection.card_id')
          .join('collection', 'collection.id_collection', '=', 'deck.id_card')
          .where('deck.user_id', user_id)
          .where('deck.deck', deckId)
          .where('deck.is_commander', true)
          .limit(1);

        if (commanderRows.length > 0) {
          // Commander already exists
          hasCommander = true;
          const commanderCardId = commanderRows[0].card_id;
          const commanderCardData = cardMap.get(commanderCardId);
          if (commanderCardData) {
            commanderName = commanderCardData.name;
            commanderColorIdentity = commanderCardData.colorIdentity || 'colorless';
          }

          prompt = getCommanderPrompt({
            remainingSlots,
            targetNonLandSize,
            currentDeckNonLandSize,
            currentDeckNonLands,
            commanderName,
            commanderColorIdentity,
            cardNamesList,
          });
        } else {
          // No commander yet - filter legendary creatures and let AI choose
          const legendaryCreatures = nonLandCards.filter(c => 
            c.supertypes && c.supertypes.includes('Legendary') && 
            c.types && c.types.includes('Creature')
          );

          if (legendaryCreatures.length === 0) {
            return res.status(400).json({ error: 'No legendary creatures found to use as commander' });
          }

          const legendaryCreaturesList = legendaryCreatures.map(c => `${c.name} (colors: ${c.colorIdentity || 'colorless'})`).join(', ');

          prompt = getCommanderPromptWithoutCommander({
            remainingSlots,
            targetNonLandSize,
            currentDeckNonLandSize,
            currentDeckNonLands,
            cardNamesList,
            legendaryCreaturesList,
          });
        }
      } else {
        prompt = getModernPrompt({
          remainingSlots,
          targetNonLandSize,
          currentDeckNonLandSize,
          currentDeckNonLands,
          selectedColorsStr,
          copyLimit,
          cardNamesList,
        });
      }

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
        model: 'llama-3.3-70b-versatile',
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

      // ── Step 9: Validate response based on format ───────────────────────────
      const collectionMap = new Map(nonLandCards.map(c => [c.name.toLowerCase(), c]));
      const deckCardNamesSet = new Set(currentDeckNonLands.map(c => c.name.toLowerCase())); // Cards already in deck
      
      // Calculate total quantity sum
      const mainboardQtySum = (deckResponse.mainboard || []).reduce((sum, c) => sum + (c.qty || 0), 0);
      const sideboardQtySum = (deckResponse.sideboard || []).reduce((sum, c) => sum + (c.qty || 0), 0);
      const totalQtySum = mainboardQtySum + sideboardQtySum;

      console.log(`[AI] Quantity check: mainboard sum=${mainboardQtySum}, sideboard sum=${sideboardQtySum}, total=${totalQtySum}, needed=${remainingSlots}`);

      // Allow tolerance of ±1 card (model limitation with arithmetic)
      const tolerance = 1;
      if (Math.abs(totalQtySum - remainingSlots) > tolerance) {
        console.error(`[AI] CRITICAL: AI did not suggest correct total quantity. Got ${totalQtySum}, needed ${remainingSlots} (tolerance: ±${tolerance})`);
        return res.status(500).json({ 
          error: `AI did not suggest the correct number of cards. Requested ${remainingSlots}, got ${totalQtySum}. Please try again.` 
        });
      }

      const validMainboard = [];
      const validSideboard = [];
      const validationErrors = [];
      const suggestedCardNames = new Set(); // Track suggested cards for singleton rule

      // Validate mainboard
      for (const card of (deckResponse.mainboard || [])) {
        const owned = collectionMap.get(card.name.toLowerCase());
        const cardNameLower = card.name.toLowerCase();
        
        if (!owned) {
          validationErrors.push(`Mainboard: "${card.name}" not in available collection`);
        } else if (isCommander && card.qty !== 1) {
          // Commander: must be singleton (qty must be 1)
          validationErrors.push(`Mainboard: "${card.name}" - Commander is singleton, qty must be 1 (got ${card.qty})`);
        } else if (!isCommander && card.qty !== owned.qty) {
          // Modern: qty must match available
          validationErrors.push(`Mainboard: "${card.name}" - requested ${card.qty} but only ${owned.qty} available`);
        } else if (isCommander && deckCardNamesSet.has(cardNameLower)) {
          // Commander: reject cards already in deck
          validationErrors.push(`Mainboard: "${card.name}" is already in deck (Commander is singleton)`);
        } else if (isCommander) {
          // Commander-specific validations
          // 1. Check singleton rule (no duplicates in suggestions)
          if (suggestedCardNames.has(cardNameLower) && !isBasicLand(card.name)) {
            validationErrors.push(`Mainboard: "${card.name}" appears multiple times in suggestions (must be unique)`);
          }
          // 2. Check color identity matches commander
          else if (!matchesCommanderColorIdentity(owned.colorIdentity, commanderColorIdentity)) {
            validationErrors.push(`Mainboard: "${card.name}" has colors outside commander identity`);
          } else {
            validMainboard.push({ ...card, card_id: owned.card_id });
            suggestedCardNames.add(cardNameLower);
          }
        } else {
          // Modern format (simpler validation)
          validMainboard.push({ ...card, card_id: owned.card_id });
        }
      }

      // Validate sideboard
      for (const card of (deckResponse.sideboard || [])) {
        const owned = collectionMap.get(card.name.toLowerCase());
        const cardNameLower = card.name.toLowerCase();
        
        if (!owned) {
          validationErrors.push(`Sideboard: "${card.name}" not in available collection`);
        } else if (isCommander && card.qty !== 1) {
          // Commander: must be singleton (qty must be 1)
          validationErrors.push(`Sideboard: "${card.name}" - Commander is singleton, qty must be 1 (got ${card.qty})`);
        } else if (!isCommander && card.qty !== owned.qty) {
          // Modern: qty must match available
          validationErrors.push(`Sideboard: "${card.name}" - requested ${card.qty} but only ${owned.qty} available`);
        } else if (isCommander && deckCardNamesSet.has(cardNameLower)) {
          // Commander: reject cards already in deck
          validationErrors.push(`Sideboard: "${card.name}" is already in deck (Commander is singleton)`);
        } else if (isCommander) {
          // Commander-specific validations
          // 1. Check singleton rule (no duplicates in suggestions)
          if (suggestedCardNames.has(cardNameLower) && !isBasicLand(card.name)) {
            validationErrors.push(`Sideboard: "${card.name}" appears multiple times in suggestions (must be unique)`);
          }
          // 2. Check color identity matches commander
          else if (!matchesCommanderColorIdentity(owned.colorIdentity, commanderColorIdentity)) {
            validationErrors.push(`Sideboard: "${card.name}" has colors outside commander identity`);
          } else {
            validSideboard.push({ ...card, card_id: owned.card_id });
            suggestedCardNames.add(cardNameLower);
          }
        } else {
          // Modern format (simpler validation)
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

      // ── Step 10: Validate commander selection (if AI chose one) ────────────
      let selectedCommander = null;
      let selectedCommanderColorIdentity = '';

      if (isCommander && !hasCommander && deckResponse.selectedCommander) {
        const selectedCommanderName = deckResponse.selectedCommander;
        const selectedCommanderCard = nonLandCards.find(c => c.name.toLowerCase() === selectedCommanderName.toLowerCase());

        if (!selectedCommanderCard) {
          validationErrors.push(`Commander: "${selectedCommanderName}" not found in available legendary creatures`);
        } else if (!selectedCommanderCard.supertypes?.includes('Legendary') || !selectedCommanderCard.types?.includes('Creature')) {
          validationErrors.push(`Commander: "${selectedCommanderName}" is not a legendary creature`);
        } else {
          selectedCommander = selectedCommanderCard;
          selectedCommanderColorIdentity = selectedCommanderCard.colorIdentity || 'colorless';
          
          // Remove commander from suggestions if it appears there (safety check)
          const selectedCommanderNameLower = selectedCommanderName.toLowerCase();
          for (let i = validMainboard.length - 1; i >= 0; i--) {
            if (validMainboard[i].name.toLowerCase() === selectedCommanderNameLower) {
              validationErrors.push(`Commander: "${selectedCommanderName}" was in suggestions but cannot be suggested (it will be added as commander)`);
              validMainboard.splice(i, 1);
            }
          }
          for (let i = validSideboard.length - 1; i >= 0; i--) {
            if (validSideboard[i].name.toLowerCase() === selectedCommanderNameLower) {
              validationErrors.push(`Commander: "${selectedCommanderName}" was in sideboard but cannot be suggested (it will be added as commander)`);
              validSideboard.splice(i, 1);
            }
          }
          
          console.log(`[AI] Selected commander: ${selectedCommander.name} (${selectedCommanderColorIdentity})`);
        }
      }

      // ── Step 11: Return result ────────────────────────────────────────────
      const result = {
        strategy: deckResponse.strategy || 'No strategy provided',
        mainboard: validMainboard,
        sideboard: validSideboard,
      };

      if (selectedCommander) {
        result.selectedCommander = {
          name: selectedCommander.name,
          colorIdentity: selectedCommanderColorIdentity,
          card_id: selectedCommander.card_id,
        };
      }

      return res.json(result);

    } catch (error) {
      console.error(`IP: ${req.ip}, Time: ${formattedDate}. ERROR:`, error);
      return res.status(500).json({ 
        error: error.message || 'Failed to build deck with AI' 
      });
    }
  },

  async applyDeck(req, res) {
    const { deckId, mainboard, sideboard, selectedCommander, strategy } = req.body;
    const user_id = req.userId;

    if (!deckId || !Array.isArray(mainboard)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    try {
      console.log(`[AI] Applying deck ${deckId}: ${mainboard.length} mainboard, ${sideboard?.length || 0} sideboard`);
      if (selectedCommander) {
        console.log(`[AI] Setting commander: ${selectedCommander.name} (${selectedCommander.colorIdentity})`);
      }
      
      // ── Step 1: Update deck description with strategy ──────────────────────
      if (strategy) {
        await knex('decks')
          .where('id', deckId)
          .where('user_id', user_id)
          .update({
            description: strategy,
          });
        console.log(`[AI] Deck description updated with strategy`);
      }
      
      // ── Step 2: If commander was selected, update deck metadata ───────────
      if (selectedCommander) {
        await knex('decks')
          .where('id', deckId)
          .where('user_id', user_id)
          .update({
            commanderName: selectedCommander.name,
            commanderColors: selectedCommander.colorIdentity,
          });
        console.log(`[AI] Deck metadata updated with commander`);
      }

      // ── Step 3: Collect only the NEW cards to insert (mainboard + sideboard) ───────
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

      // ── Step 4: Insert all NEW cards in one operation (existing cards remain) ──────
      if (cardsToInsert.length > 0) {
        await knex('deck').insert(cardsToInsert);
        console.log(`[AI] Inserted ${cardsToInsert.length} cards into deck ${deckId}`);
      } else {
        console.warn(`[AI] WARNING: No cards were inserted!`);
      }

      // ── Step 5: If commander was selected, add it to the deck ────────────
      if (selectedCommander) {
        const commanderRows = await knex('collection')
          .select('id_collection')
          .where('user_id', user_id)
          .where('card_id', selectedCommander.card_id)
          .limit(1);

        if (commanderRows.length > 0) {
          await knex('deck').insert({
            user_id,
            deck: deckId,
            id_card: commanderRows[0].id_collection,
            sideboard: 0,
            is_commander: true,
          });
          console.log(`[AI] Commander card added: ${selectedCommander.name}`);
        } else {
          console.warn(`[AI] WARNING: No physical commander copy found!`);
        }
      }

      return res.json({
        success: true,
        cardsAdded: cardsToInsert.length,
        commanderAdded: selectedCommander ? selectedCommander.name : null,
      });

    } catch (error) {
      console.error(`[AI] Apply deck failed:`, error);
      return res.status(500).json({ 
        error: error.message || 'Failed to apply deck' 
      });
    }
  },
};
