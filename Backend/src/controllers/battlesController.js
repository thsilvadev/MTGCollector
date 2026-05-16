const knex = require('../database/index');

module.exports = {

  // POST /battles  — challenger declares a battle against a deck owner
  async declareBattle(req, res) {
    const challengerId = req.userId;
    const { deck_id, battle_date, score_challenger, score_deck_owner } = req.body;
    const now = new Date().toISOString();

    if (!deck_id)      return res.status(400).json({ error: 'deck_id is required.' });
    if (!battle_date)  return res.status(400).json({ error: 'battle_date is required.' });
    if (score_challenger == null || score_deck_owner == null) {
      return res.status(400).json({ error: 'Both scores are required.' });
    }

    try {
      const deck = await knex('decks')
        .select('id_deck', 'user_id', 'name')
        .where('id_deck', deck_id)
        .first();

      if (!deck) return res.status(404).json({ error: 'Deck not found.' });
      if (deck.user_id === challengerId) {
        return res.status(400).json({ error: 'Cannot declare a battle against your own deck.' });
      }

      const [id_battle] = await knex('battles').insert({
        challenger_id:    challengerId,
        deck_owner_id:    deck.user_id,
        deck_id:          deck_id,
        battle_date:      new Date(battle_date),
        score_challenger: Number(score_challenger),
        score_deck_owner: Number(score_deck_owner),
        status:           'pending',
      });

      console.log(`\x1b[33m${now}\x1b[0m [battles] POST /battles — challenger ${challengerId} vs deck ${deck_id} (owner ${deck.user_id})`);
      return res.status(201).json({ id_battle, message: 'Battle declared. Awaiting confirmation.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to declare battle.' });
    }
  },

  // PUT /battles/:id/accept  — deck owner accepts the battle
  async acceptBattle(req, res) {
    const userId    = req.userId;
    const battleId  = Number(req.params.id);
    const now = new Date().toISOString();

    if (!battleId) return res.status(400).json({ error: 'Invalid battle id.' });

    try {
      const battle = await knex('battles')
        .where({ id_battle: battleId, deck_owner_id: userId, status: 'pending' })
        .first();

      if (!battle) return res.status(404).json({ error: 'Battle not found or already resolved.' });

      await knex('battles').where({ id_battle: battleId }).update({ status: 'accepted' });

      console.log(`\x1b[33m${now}\x1b[0m [battles] PUT /battles/${battleId}/accept — userId ${userId}`);
      return res.status(200).json({ message: 'Battle accepted.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to accept battle.' });
    }
  },

  // PUT /battles/:id/decline  — deck owner declines the battle
  async declineBattle(req, res) {
    const userId   = req.userId;
    const battleId = Number(req.params.id);
    const now = new Date().toISOString();

    if (!battleId) return res.status(400).json({ error: 'Invalid battle id.' });

    try {
      const deleted = await knex('battles')
        .where({ id_battle: battleId, deck_owner_id: userId, status: 'pending' })
        .update({ status: 'declined' });

      if (!deleted) return res.status(404).json({ error: 'Battle not found or already resolved.' });

      console.log(`\x1b[33m${now}\x1b[0m [battles] PUT /battles/${battleId}/decline — userId ${userId}`);
      return res.status(200).json({ message: 'Battle declined.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to decline battle.' });
    }
  },

  // GET /battles  — all battles where the user is challenger or deck owner
  async getMyBattles(req, res) {
    const userId = req.userId;
    try {
      const rows = await knex('battles as b')
        .join('decks as d',       'b.deck_id',        'd.id_deck')
        .join('users as challenger', 'b.challenger_id', 'challenger.id_user')
        .join('users as owner',      'b.deck_owner_id', 'owner.id_user')
        .select(
          'b.id_battle',
          'b.battle_date',
          'b.score_challenger',
          'b.score_deck_owner',
          'b.status',
          'b.created_at',
          'd.id_deck',
          'd.name as deck_name',
          'd.color as deck_color',
          'challenger.id_user as challenger_id',
          'challenger.game_tag as challenger_game_tag',
          'challenger.name as challenger_name',
          'owner.id_user as deck_owner_id',
          'owner.game_tag as deck_owner_game_tag',
          'owner.name as deck_owner_name'
        )
        .where(function () {
          this.where('b.challenger_id', userId).orWhere('b.deck_owner_id', userId);
        })
        .orderBy('b.created_at', 'desc');

      return res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch battles.' });
    }
  },
};
