-- Migration 004: Add friendship tables
-- friend_requests: pending invites between users
-- friendships: accepted connections (canonical pair: user_id_1 < user_id_2)

CREATE TABLE IF NOT EXISTS friend_requests (
  id_request  INT          NOT NULL AUTO_INCREMENT,
  sender_id   INT          NOT NULL,
  receiver_id INT          NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_request),
  UNIQUE KEY uq_request (sender_id, receiver_id),
  CONSTRAINT fk_fr_sender   FOREIGN KEY (sender_id)   REFERENCES users (id_user) ON DELETE CASCADE,
  CONSTRAINT fk_fr_receiver FOREIGN KEY (receiver_id) REFERENCES users (id_user) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS friendships (
  id_friendship INT       NOT NULL AUTO_INCREMENT,
  user_id_1     INT       NOT NULL,
  user_id_2     INT       NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_friendship),
  UNIQUE KEY uq_friendship (user_id_1, user_id_2),
  CONSTRAINT fk_fs_user1 FOREIGN KEY (user_id_1) REFERENCES users (id_user) ON DELETE CASCADE,
  CONSTRAINT fk_fs_user2 FOREIGN KEY (user_id_2) REFERENCES users (id_user) ON DELETE CASCADE
);
