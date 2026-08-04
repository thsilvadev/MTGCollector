/**
 * AI Prompt Templates for Deck Building
 * Separated by format due to different rules and constraints
 */

/**
 * Generate prompt for Modern format (36 non-land cards)
 */
function getModernPrompt({
  remainingSlots,
  targetNonLandSize,
  currentDeckNonLandSize,
  currentDeckNonLands,
  selectedColorsStr,
  copyLimit,
  cardNamesList,
}) {
  return `You are an expert Magic: The Gathering Modern deckbuilder.

OBJECTIVE: Suggest cards to complete the deck.

CURRENT DECK STATE:
- Non-land cards in mainboard: ${currentDeckNonLandSize}
- Target non-land cards in mainboard: ${targetNonLandSize}
- NEED EXACTLY: ${remainingSlots} more cards in MAINBOARD

${currentDeckNonLands.length > 0 ? `Cards already in deck: ${currentDeckNonLands.map(c => `${c.name}(${c.qty})`).join(', ')}` : 'Deck is empty.'}

CRITICAL RULES - DO NOT IGNORE:
1. MAINBOARD: Put exactly ${remainingSlots} cards in "mainboard" array (sum of quantities = ${remainingSlots})
2. SIDEBOARD: Optional. Maximum 15 cards total in "sideboard" array (0 to 15 cards)
3. You can ONLY use cards from the available list below
4. NEVER suggest more of a card than shown in parentheses
5. Max ${copyLimit} copies of any single card name
6. Colors: ${selectedColorsStr}
7. DO NOT INCLUDE LANDS - player chooses lands separately

AVAILABLE CARDS (format: name (available_qty)):
${cardNamesList}

RESPONSE EXAMPLE (EXACTLY this format):
{
  "strategy": "brief strategy description",
  "mainboard": [
    {"name": "Card One", "qty": 4},
    {"name": "Card Two", "qty": 3},
    {"name": "Card Three", "qty": 4}
  ],
  "sideboard": [
    {"name": "Card Four", "qty": 2},
    {"name": "Card Five", "qty": 3}
  ]
}

Example above: mainboard = 4+3+4 = 11, sideboard = 2+3 = 5 (if remainingSlots were 11).
YOUR MAINBOARD SUM MUST BE: ${remainingSlots}
SIDEBOARD SUM MUST BE: 0-15

RESPONSE - JSON ONLY, NO OTHER TEXT:`;
}

/**
 * Generate prompt for Commander format WITHOUT a commander (60 non-land cards, singleton except basics)
 * AI must select a legendary creature as commander
 */
function getCommanderPromptWithoutCommander({
  remainingSlots,
  targetNonLandSize,
  currentDeckNonLandSize,
  currentDeckNonLands,
  cardNamesList,
  legendaryCreaturesList,
}) {
  return `You are an expert Magic: The Gathering Commander deckbuilder.

OBJECTIVE: 
1. SELECT a Legendary Creature as the commander from the available list
2. Suggest cards to complete the deck with a TOTAL of EXACTLY ${remainingSlots} card copies (all singleton, qty=1 each)

CURRENT DECK STATE:
- Non-land cards in deck: ${currentDeckNonLandSize}
- Target non-land cards: ${targetNonLandSize} (including commander, 60-69 typical)
- Need to add: EXACTLY ${remainingSlots} unique cards (each with qty: 1)

${currentDeckNonLands.length > 0 ? `Cards already in deck: ${currentDeckNonLands.map(c => c.name).join(', ')}` : 'Deck is empty.'}

STRICT RULES - YOU MUST FOLLOW ALL (Commander is SINGLETON):
1. FIRST: Select ONE legendary creature as commander from the available list
2. TOTAL CARDS to suggest around that commander: EXACTLY ${remainingSlots} unique cards
3. EVERY card must have qty: 1 (no other number allowed)
4. Each card can ONLY appear ONCE in your suggestions
5. NEVER suggest cards already in the deck
6. NEVER suggest the selected commander card itself in suggestions (it will be added separately)
7. NEVER suggest cards outside the selected commander's color identity
8. You can ONLY use cards from the available list below
9. NEVER suggest more than the available quantity for any card
10. DO NOT INCLUDE LANDS - the player will choose lands separately
11. Colors allowed: ONLY commander's color identity and colorless cards

AVAILABLE LEGENDARY CREATURES (choose ONE as commander):
${legendaryCreaturesList}

AVAILABLE CARDS (format: name (available_qty)) - ALL NON-LAND CARDS:
${cardNamesList}

RESPONSE EXAMPLE (EXACTLY this format):
{
  "selectedCommander": "Blue Red Wizard Commander Name",
  "strategy": "wizard-focused spellslinger deck",
  "mainboard": [
    {"name": "Card One", "qty": 1},
    {"name": "Card Two", "qty": 1}
  ],
  "sideboard": [
    {"name": "Card Three", "qty": 1}
  ]
}

Notes: 2+1 = 3 total cards (if ${remainingSlots} were 3). EVERY qty MUST be 1.

RESPONSE - ONLY VALID JSON, NO OTHER TEXT, ENSURE ALL QTY = 1 AND TOTAL = ${remainingSlots}:`;
}

/**
 * Generate prompt for Commander format (60 non-land cards, singleton except basics)
 */
function getCommanderPrompt({
  remainingSlots,
  targetNonLandSize,
  currentDeckNonLandSize,
  currentDeckNonLands,
  commanderName,
  commanderColorIdentity,
  cardNamesList,
}) {
  const deckCardNames = currentDeckNonLands.map(c => c.name).join(', ');
  
  return `You are an expert Magic: The Gathering Commander deckbuilder.

OBJECTIVE: Suggest cards to complete the deck with a TOTAL of EXACTLY ${remainingSlots} card copies (all singleton, qty=1 each).

COMMANDER: ${commanderName}
Commander color identity: ${commanderColorIdentity}

CURRENT DECK STATE:
- Non-land cards in deck: ${currentDeckNonLandSize}
- Target non-land cards: ${targetNonLandSize} (including commander, 60-69 typical)
- Need to add: EXACTLY ${remainingSlots} unique cards (each with qty: 1)

Cards already in deck (DO NOT SUGGEST THESE): ${deckCardNames || 'Deck is empty'}

STRICT RULES - YOU MUST FOLLOW ALL (Commander is SINGLETON):
1. TOTAL CARDS to suggest: EXACTLY ${remainingSlots} unique cards
2. EVERY card must have qty: 1 (no other number allowed)
3. Each card can ONLY appear ONCE in your suggestions
4. NEVER suggest a card that is already in the deck listed above
5. You can ONLY use cards from the available list below
6. NEVER suggest cards outside the commander's color identity
7. NEVER suggest more than the available quantity for any card
8. DO NOT INCLUDE LANDS - the player will choose lands separately
9. Colors allowed: ONLY ${commanderColorIdentity} and colorless cards

AVAILABLE CARDS (format: name (available_qty)):
${cardNamesList}

RESPONSE EXAMPLE (EXACTLY this format):
{
  "strategy": "ramp and token generation focused on green power",
  "mainboard": [
    {"name": "Card One", "qty": 1},
    {"name": "Card Two", "qty": 1},
    {"name": "Card Three", "qty": 1}
  ],
  "sideboard": [
    {"name": "Card Four", "qty": 1}
  ]
}

Notes: 3+1 = 4 total cards (if ${remainingSlots} were 4). EVERY qty MUST be 1.

RESPONSE - ONLY VALID JSON, NO OTHER TEXT, ENSURE ALL QTY = 1 AND TOTAL = ${remainingSlots}:`;
}

module.exports = {
  getModernPrompt,
  getCommanderPrompt,
  getCommanderPromptWithoutCommander,
};
