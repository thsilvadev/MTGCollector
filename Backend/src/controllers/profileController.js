const knex = require('../database/index');

// ─── Badge definitions ────────────────────────────────────────────────────────

const BADGE_DEFS = [
  { id: 'cards_100',    icon: '🃏', label: '100 cartas',           description: 'Adicionou 100 cartas à coleção' },
  { id: 'cards_500',    icon: '📦', label: '500 cartas',           description: 'Adicionou 500 cartas à coleção' },
  { id: 'cards_1000',   icon: '💎', label: '1000 cartas',          description: 'Adicionou 1000 cartas à coleção' },
  { id: 'cards_2000',   icon: '👑', label: '2000 cartas',          description: 'Adicionou 2000 cartas à coleção' },
  { id: 'wins_10',      icon: '⚔️', label: '10 batalhas vencidas', description: 'Venceu 10 batalhas' },
  { id: 'wins_20',      icon: '🔥', label: '20 batalhas vencidas', description: 'Venceu 20 batalhas' },
  { id: 'wins_50',      icon: '🏆', label: '50 batalhas vencidas', description: 'Venceu 50 batalhas' },
  { id: 'wins_100',     icon: '🌟', label: '100 batalhas vencidas',description: 'Venceu 100 batalhas' },
  { id: 'veteran',      icon: '🎂', label: '1 ano de usuário',     description: 'Está no MTG Chest há mais de 1 ano' },
];

async function computeBadges(targetUserId) {
  // Card count
  const [{ cardCount }] = await knex('collection')
    .where('user_id', targetUserId)
    .count('id_collection as cardCount');

  // Wins count: accepted battles where the user was on the winning side
  const [{ winsCount }] = await knex('battles')
    .where(function () {
      this
        .where(function () {
          this.where('challenger_id', targetUserId)
            .whereRaw('score_challenger > score_deck_owner');
        })
        .orWhere(function () {
          this.where('deck_owner_id', targetUserId)
            .whereRaw('score_deck_owner > score_challenger');
        });
    })
    .where('status', 'accepted')
    .count('id_battle as winsCount');

  // Account age
  const user = await knex('users')
    .select('created_at')
    .where('id_user', targetUserId)
    .first();

  const now = Date.now();
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  const isVeteran = user && user.created_at
    ? now - new Date(user.created_at).getTime() >= ONE_YEAR_MS
    : false;

  const c = Number(cardCount);
  const w = Number(winsCount);

  return BADGE_DEFS.map((def) => {
    let unlocked = false;
    if (def.id === 'cards_100')  unlocked = c >= 100;
    if (def.id === 'cards_500')  unlocked = c >= 500;
    if (def.id === 'cards_1000') unlocked = c >= 1000;
    if (def.id === 'cards_2000') unlocked = c >= 2000;
    if (def.id === 'wins_10')    unlocked = w >= 10;
    if (def.id === 'wins_20')    unlocked = w >= 20;
    if (def.id === 'wins_50')    unlocked = w >= 50;
    if (def.id === 'wins_100')   unlocked = w >= 100;
    if (def.id === 'veteran')    unlocked = isVeteran;
    return { ...def, locked: !unlocked };
  });
}

function resolveUserId(param, reqUserId) {
  if (param === 'me') return reqUserId;
  const n = Number(param);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function areFriends(userA, userB) {
  if (userA === userB) return true;
  const minId = Math.min(userA, userB);
  const maxId = Math.max(userA, userB);
  const row = await knex('friendships')
    .where({ user_id_1: minId, user_id_2: maxId })
    .first();
  return !!row;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

module.exports = {

  // GET /profile/:userId
  async getProfile(req, res) {
    const targetUserId = resolveUserId(req.params.userId, req.userId);
    if (!targetUserId) return res.status(400).json({ error: 'Invalid userId.' });

    try {
      const user = await knex('users')
        .select('id_user', 'name', 'game_tag', 'created_at')
        .where('id_user', targetUserId)
        .first();

      if (!user) return res.status(404).json({ error: 'User not found.' });

      const badges = await computeBadges(targetUserId);

      return res.status(200).json({
        id_user:   user.id_user,
        name:      user.name || user.game_tag,
        game_tag:  user.game_tag,
        badges,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch profile.' });
    }
  },

  // GET /profile/:userId/decks  — only accessible to friends or own profile
  async getProfileDecks(req, res) {
    const requesterId  = req.userId;
    const targetUserId = resolveUserId(req.params.userId, req.userId);
    if (!targetUserId) return res.status(400).json({ error: 'Invalid userId.' });

    try {
      const friends = await areFriends(requesterId, targetUserId);
      if (!friends) {
        return res.status(403).json({ error: 'You must be friends to view this profile\'s decks.' });
      }

      const decks = await knex('decks')
        .select('id_deck', 'name', 'color', 'format', 'card_count')
        .where('user_id', targetUserId)
        .orderBy('id_deck', 'desc');

      return res.status(200).json(decks);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch decks.' });
    }
  },

  // GET /profile/:userId/testimonials?limit=3&offset=0
  async getTestimonials(req, res) {
    const targetUserId = resolveUserId(req.params.userId, req.userId);
    if (!targetUserId) return res.status(400).json({ error: 'Invalid userId.' });

    const limit  = Math.min(Number(req.query.limit)  || 3,  50);
    const offset = Number(req.query.offset) || 0;

    try {
      const [{ total }] = await knex('testimonials')
        .where('target_user_id', targetUserId)
        .count('id_testimonial as total');

      const rows = await knex('testimonials as t')
        .join('users as u', 't.author_id', 'u.id_user')
        .select(
          't.id_testimonial',
          't.author_id',
          'u.name as authorName',
          'u.game_tag as authorGameTag',
          't.text',
          't.created_at'
        )
        .where('t.target_user_id', targetUserId)
        .orderBy('t.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return res.status(200).json({ total: Number(total), testimonials: rows });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch testimonials.' });
    }
  },

  // POST /profile/:userId/testimonials
  async addTestimonial(req, res) {
    const authorId     = req.userId;
    const targetUserId = resolveUserId(req.params.userId, req.userId);
    const { text }     = req.body;

    if (!targetUserId) return res.status(400).json({ error: 'Invalid userId.' });
    if (authorId === targetUserId) return res.status(400).json({ error: 'Cannot leave a testimonial on your own profile.' });
    if (!text || !text.trim()) return res.status(400).json({ error: 'Text is required.' });
    if (text.trim().length > 500) return res.status(400).json({ error: 'Text must be 500 characters or fewer.' });

    try {
      await knex('testimonials').insert({
        author_id:      authorId,
        target_user_id: targetUserId,
        text:           text.trim(),
      });
      return res.status(201).json({ message: 'Testimonial added.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to add testimonial.' });
    }
  },
};
