const knex = require('../database/index');

module.exports = {

  // GET /friends — list all accepted friends of the authenticated user
  async getFriends(req, res) {
    const userId = req.userId;
    const now = new Date().toISOString();
    try {
      const rows = await knex('friendships')
        .select('id_friendship', 'user_id_1', 'user_id_2')
        .where('user_id_1', userId)
        .orWhere('user_id_2', userId);

      if (rows.length === 0) return res.status(200).json([]);

      const friendIds = rows.map((r) =>
        r.user_id_1 === userId ? r.user_id_2 : r.user_id_1
      );

      const users = await knex('users')
        .select('id_user', 'name', 'game_tag')
        .whereIn('id_user', friendIds);

      const friendshipMap = new Map(
        rows.map((r) => {
          const friendId = r.user_id_1 === userId ? r.user_id_2 : r.user_id_1;
          return [friendId, r.id_friendship];
        })
      );

      const result = users.map((u) => ({
        id_friendship: friendshipMap.get(u.id_user),
        id_user: u.id_user,
        name: u.name || u.game_tag,
        game_tag: u.game_tag,
        lastSeen: null,
      }));

      console.log(`\x1b[33m${now}\x1b[0m [friends] GET /friends — userId ${userId}, count ${result.length}`);
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch friends.' });
    }
  },

  // GET /friends/requests — list pending invites received by the authenticated user
  async getRequests(req, res) {
    const userId = req.userId;
    const now = new Date().toISOString();
    try {
      const requests = await knex('friend_requests as fr')
        .join('users as u', 'fr.sender_id', 'u.id_user')
        .select(
          'fr.id_request',
          'u.id_user',
          'u.name',
          'u.game_tag',
          'fr.created_at'
        )
        .where('fr.receiver_id', userId);

      if (requests.length === 0) return res.status(200).json([]);

      // Calculate mutual friends count per sender
      const result = await Promise.all(
        requests.map(async (req_row) => {
          const senderId = req_row.id_user;

          // Friends of the current user
          const myFriendships = await knex('friendships')
            .select('user_id_1', 'user_id_2')
            .where('user_id_1', userId)
            .orWhere('user_id_2', userId);
          const myFriendIds = new Set(
            myFriendships.map((r) =>
              r.user_id_1 === userId ? r.user_id_2 : r.user_id_1
            )
          );

          // Friends of the sender
          const theirFriendships = await knex('friendships')
            .select('user_id_1', 'user_id_2')
            .where('user_id_1', senderId)
            .orWhere('user_id_2', senderId);
          const theirFriendIds = new Set(
            theirFriendships.map((r) =>
              r.user_id_1 === senderId ? r.user_id_2 : r.user_id_1
            )
          );

          let mutualCount = 0;
          for (const id of myFriendIds) {
            if (theirFriendIds.has(id)) mutualCount++;
          }

          return {
            id_request: req_row.id_request,
            id_user: req_row.id_user,
            name: req_row.name || req_row.game_tag,
            game_tag: req_row.game_tag,
            mutualCount,
          };
        })
      );

      console.log(`\x1b[33m${now}\x1b[0m [friends] GET /friends/requests — userId ${userId}, count ${result.length}`);
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch friend requests.' });
    }
  },

  // GET /friends/badge — count of pending notifications (requests + future: battle declarations)
  async getBadgeCount(req, res) {
    const userId = req.userId;
    try {
      const [{ count }] = await knex('friend_requests')
        .count('id_request as count')
        .where('receiver_id', userId);

      const friendRequests = Number(count);
      return res.status(200).json({
        friendRequests,
        battleDeclarations: 0,
        total: friendRequests,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch badge count.' });
    }
  },

  // POST /friends/request — send a friend request by game_tag
  async sendRequest(req, res) {
    const userId = req.userId;
    const { game_tag } = req.body;
    const now = new Date().toISOString();

    if (!game_tag || typeof game_tag !== 'string' || !game_tag.trim()) {
      return res.status(400).json({ error: 'game_tag is required.' });
    }

    try {
      const target = await knex('users')
        .select('id_user')
        .where('game_tag', game_tag.trim())
        .first();

      if (!target) {
        return res.status(404).json({ error: 'User not found.' });
      }

      if (target.id_user === userId) {
        return res.status(400).json({ error: 'You cannot add yourself.' });
      }

      // Check if already friends
      const minId = Math.min(userId, target.id_user);
      const maxId = Math.max(userId, target.id_user);
      const existing = await knex('friendships')
        .where({ user_id_1: minId, user_id_2: maxId })
        .first();
      if (existing) {
        return res.status(409).json({ error: 'Already friends.' });
      }

      // Check if a pending request already exists in either direction
      const pendingRequest = await knex('friend_requests')
        .where(function () {
          this.where({ sender_id: userId, receiver_id: target.id_user })
            .orWhere({ sender_id: target.id_user, receiver_id: userId });
        })
        .first();
      if (pendingRequest) {
        return res.status(409).json({ error: 'A pending request already exists.' });
      }

      await knex('friend_requests').insert({
        sender_id: userId,
        receiver_id: target.id_user,
      });

      console.log(`\x1b[33m${now}\x1b[0m [friends] POST /friends/request — from ${userId} to ${target.id_user}`);
      return res.status(201).json({ message: 'Friend request sent.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to send friend request.' });
    }
  },

  // PUT /friends/request/:id/accept — accept a received friend request
  async acceptRequest(req, res) {
    const userId = req.userId;
    const requestId = Number(req.params.id);
    const now = new Date().toISOString();

    if (!requestId) return res.status(400).json({ error: 'Invalid request id.' });

    try {
      const request = await knex('friend_requests')
        .where({ id_request: requestId, receiver_id: userId })
        .first();

      if (!request) {
        return res.status(404).json({ error: 'Friend request not found.' });
      }

      const minId = Math.min(request.sender_id, request.receiver_id);
      const maxId = Math.max(request.sender_id, request.receiver_id);

      await knex.transaction(async (trx) => {
        await trx('friendships').insert({ user_id_1: minId, user_id_2: maxId });
        await trx('friend_requests').where({ id_request: requestId }).delete();
      });

      console.log(`\x1b[33m${now}\x1b[0m [friends] PUT /friends/request/${requestId}/accept — userId ${userId}`);
      return res.status(200).json({ message: 'Friend request accepted.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to accept friend request.' });
    }
  },

  // PUT /friends/request/:id/decline — decline a received friend request
  async declineRequest(req, res) {
    const userId = req.userId;
    const requestId = Number(req.params.id);
    const now = new Date().toISOString();

    if (!requestId) return res.status(400).json({ error: 'Invalid request id.' });

    try {
      const deleted = await knex('friend_requests')
        .where({ id_request: requestId, receiver_id: userId })
        .delete();

      if (!deleted) {
        return res.status(404).json({ error: 'Friend request not found.' });
      }

      console.log(`\x1b[33m${now}\x1b[0m [friends] PUT /friends/request/${requestId}/decline — userId ${userId}`);
      return res.status(200).json({ message: 'Friend request declined.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to decline friend request.' });
    }
  },

  // DELETE /friends/:friendId — remove an accepted friend
  async removeFriend(req, res) {
    const userId = req.userId;
    const friendId = Number(req.params.friendId);
    const now = new Date().toISOString();

    if (!friendId) return res.status(400).json({ error: 'Invalid friend id.' });

    try {
      const minId = Math.min(userId, friendId);
      const maxId = Math.max(userId, friendId);

      const deleted = await knex('friendships')
        .where({ user_id_1: minId, user_id_2: maxId })
        .delete();

      if (!deleted) {
        return res.status(404).json({ error: 'Friendship not found.' });
      }

      console.log(`\x1b[33m${now}\x1b[0m [friends] DELETE /friends/${friendId} — userId ${userId}`);
      return res.status(200).json({ message: 'Friend removed.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to remove friend.' });
    }
  },
};
