/**
 * deckRules.js — pure validation functions for MTG deck formats.
 * No external imports. All functions are side-effect free.
 */

/** Parse colorIdentity string "B, G, R" → Set(['B','G','R']) */
export function parseColorIdentity(ciStr) {
  if (!ciStr) return new Set();
  return new Set(ciStr.split(',').map(s => s.trim()).filter(Boolean));
}

/** True if the card is a land (any kind). */
export function isLand(card) {
  return !!(card.types && card.types.includes('Land'));
}

/**
 * True if the card is a Legendary Creature.
 * Uses the normalised `supertypes` ("Legendary") and `types` ("Creature") fields
 * that come from scryfall.js normalizeCard().
 */
export function isLegendaryCreature(card) {
  return !!(
    card.supertypes && card.supertypes.includes('Legendary') &&
    card.types      && card.types.includes('Creature')
  );
}

/**
 * Standard format rules:
 *  - Main deck must have at least 60 cards
 *  - Max 4 copies of any non-land card (by name)
 *
 * @param {Array} mainDeckCards — aggregated deck rows (each has countById, name, types, supertypes, id)
 * @returns {{ isValid: boolean, errors: string[], cardIssues: Map<string, string> }}
 */
export function standardRules(mainDeckCards) {
  const errors     = [];
  const cardIssues = new Map();

  const total = mainDeckCards.reduce((sum, c) => sum + c.countById, 0);
  if (total < 60) {
    errors.push(`Main deck needs at least 60 cards (${total}/60)`);
  }

  // Flag any >4-copy violations (e.g. after switching from another format)
  const nameCounts = {};
  mainDeckCards.forEach(card => {
    if (!isLand(card)) {
      nameCounts[card.name] = (nameCounts[card.name] || 0) + card.countById;
    }
  });

  Object.entries(nameCounts).forEach(([, count]) => {
    if (count > 4) {
      mainDeckCards
        .filter(c => !isLand(c) && nameCounts[c.name] > 4)
        .forEach(c => cardIssues.set(c.id, `${c.countById} copies (max 4 allowed)`));
      if (!errors.some(e => e.includes('4-copy'))) {
        errors.push('Some cards exceed the 4-copy limit');
      }
    }
  });

  return {
    isValid: errors.length === 0 && cardIssues.size === 0,
    errors,
    cardIssues,
  };
}

/**
 * Commander format rules:
 *  - Main deck must have exactly 100 cards
 *  - Max 1 copy of any non-land card (by name)
 *  - A Legendary Creature must be designated as Commander
 *  - Commander must be present in the main deck
 *  - Every card's color_identity must be a subset of the commander's color_identity
 *    (colorless cards — empty identity — are always allowed)
 *
 * @param {Array}       mainDeckCards
 * @param {string|null} commanderName
 * @returns {{ isValid: boolean, errors: string[], cardIssues: Map<string, string> }}
 */
export function commanderRules(mainDeckCards, commanderName) {
  const errors     = [];
  const cardIssues = new Map();

  const total = mainDeckCards.reduce((sum, c) => sum + c.countById, 0);
  if (total !== 100) {
    errors.push(`Commander deck must have exactly 100 cards (${total}/100)`);
  }

  if (!commanderName) {
    errors.push('No Commander set — click "Set Commander" on a Legendary Creature in the deck');
  }

  const commanderCard = commanderName
    ? mainDeckCards.find(c => c.name === commanderName)
    : null;

  if (commanderName && !commanderCard) {
    errors.push(`Commander "${commanderName}" is not in the main deck`);
  }

  const commanderColorSet = commanderCard
    ? parseColorIdentity(commanderCard.colorIdentity)
    : null;

  // Build name→total count for 1-copy rule
  const nameCounts = {};
  mainDeckCards.forEach(card => {
    if (!isLand(card)) {
      nameCounts[card.name] = (nameCounts[card.name] || 0) + card.countById;
    }
  });

  let hasCopyViolation   = false;
  let hasColorViolation  = false;

  mainDeckCards.forEach(card => {
    const issues = [];

    // 1-copy rule (lands are exempt)
    if (!isLand(card) && nameCounts[card.name] > 1) {
      issues.push(`${card.countById} copies (max 1 in Commander)`);
      hasCopyViolation = true;
    }

    // Color identity rule (only when commander is defined)
    if (commanderColorSet !== null) {
      const cardCI = parseColorIdentity(card.colorIdentity);
      if (cardCI.size > 0) { // empty = colorless → always legal
        const hasOutsideColor = [...cardCI].some(c => !commanderColorSet.has(c));
        if (hasOutsideColor) {
          issues.push('Color outside commander\'s identity');
          hasColorViolation = true;
        }
      }
    }

    if (issues.length) {
      cardIssues.set(card.id, issues.join(' · '));
    }
  });

  if (hasCopyViolation)  errors.push('Some cards exceed the 1-copy Commander limit');
  if (hasColorViolation) errors.push('Some cards have colors outside the commander\'s identity');

  return {
    isValid: errors.length === 0,
    errors,
    cardIssues,
  };
}
