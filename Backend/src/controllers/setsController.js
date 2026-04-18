const scryfall = require('../utils/scryfall');

module.exports = {
  async getSets(req, res) {
    try {
      const sets = await scryfall.getSets();

      // Mirror the original filter (mcmName IS NOT NULL) by excluding digital-only sets.
      const filtered = sets
        .filter(s => !s.digital)
        .map(s => ({ keyruneCode: s.code, name: s.name }));

      const now = new Date();
      console.log(`Sets request by ${req.ip} at ${now.toISOString()}`);
      return res.json(filtered);
    } catch (error) {
      const now = new Date();
      console.error(`IP: ${req.ip}, Time: ${now.toISOString()}. ERROR:`, error);
      return res.status(500).json({ error: 'Failed to fetch sets from Scryfall.' });
    }
  },
};