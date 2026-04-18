const scryfall = require('../utils/scryfall');

// Map frontend query params to a Scryfall search query string.
// `resolvedName`: canonical English name if resolved, null otherwise.
// `foreignFallback`: when true, the name is used as a bare term (no `name:` prefix)
//   so Scryfall searches across all-language printed names (requires include_multilingual).
function buildScryfallQuery(query, resolvedName, foreignFallback) {
  const parts = [];
  const { name, types, setCode, rarity, colorIdentity } = query;

  if (name) {
    if (foreignFallback) {
      // Bare term — Scryfall will match against foreign printed names when
      // include_multilingual=true is sent alongside.
      parts.push(`"${name}"`);
    } else {
      // Resolved to a canonical English name — use explicit operator.
      parts.push(`name:"${resolvedName || name}"`);
    }
  }
  if (types) {
    parts.push(`t:${types}`);
  }
  if (setCode) {
    parts.push(`set:${setCode}`);
  }
  if (rarity) {
    parts.push(`r:${rarity}`);
  }
  if (colorIdentity) {
    const colors = colorIdentity.replace(/[,\s]/g, '').toLowerCase();
    if (colors && colors !== 'wubrg') {
      parts.push(`ci<=${colors}`);
    }
  }

  return parts.join(' ') || 'game:paper';
}

module.exports = {
  async getById(req, res) {
    return res.status(404).json({ error: 'Endpoint not implemented.' });
  },

  async getAll(req, res) {
    const { params, query } = req;
    const { page } = params;

    try {
      let resolvedName = null;
      let foreignFallback = false;

      if (query.name) {
        resolvedName = await scryfall.resolveCardName(query.name);
        if (!resolvedName) {
          // Fuzzy failed (ambiguous or not found) — treat as foreign substring search.
          foreignFallback = true;
        }
      }

      const q = buildScryfallQuery(query, resolvedName, foreignFallback);
      const scryfallPage = parseInt(page, 10) + 1;

      const { data } = await scryfall.searchCards(q, scryfallPage, {
        includeMultilingual: foreignFallback,
      });

      const now = new Date();
      console.log(`Cards request by ${req.ip} at ${now.toISOString()} q="${q}" multilingual=${foreignFallback} page=${scryfallPage}`);
      return res.json(data);
    } catch (error) {
      const now = new Date();
      console.error(`IP: ${req.ip}, Time: ${now.toISOString()}. ERROR:`, error);
      return res.status(500).json({ error: 'Failed to fetch cards from Scryfall.' });
    }
  },
};
