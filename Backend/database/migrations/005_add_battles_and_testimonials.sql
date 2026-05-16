-- Migration 005: Add battles, testimonials, and users.created_at

-- Add created_at to users (idempotent)
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'users'
    AND COLUMN_NAME  = 'created_at'
);
SET @sql = IF(
  @col_exists > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Battles table
CREATE TABLE IF NOT EXISTS battles (
  id_battle          INT               NOT NULL AUTO_INCREMENT,
  challenger_id      INT               NOT NULL,
  deck_owner_id      INT               NOT NULL,
  deck_id            INT               NOT NULL,
  battle_date        DATETIME          NOT NULL,
  score_challenger   TINYINT UNSIGNED  NOT NULL DEFAULT 0,
  score_deck_owner   TINYINT UNSIGNED  NOT NULL DEFAULT 0,
  status             ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  created_at         TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_battle),
  CONSTRAINT fk_bat_challenger  FOREIGN KEY (challenger_id)  REFERENCES users (id_user) ON DELETE CASCADE,
  CONSTRAINT fk_bat_deck_owner  FOREIGN KEY (deck_owner_id)  REFERENCES users (id_user) ON DELETE CASCADE,
  CONSTRAINT fk_bat_deck        FOREIGN KEY (deck_id)        REFERENCES decks (id_deck)  ON DELETE CASCADE
);

-- Testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id_testimonial   INT       NOT NULL AUTO_INCREMENT,
  author_id        INT       NOT NULL,
  target_user_id   INT       NOT NULL,
  text             TEXT      NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_testimonial),
  CONSTRAINT fk_test_author FOREIGN KEY (author_id)      REFERENCES users (id_user) ON DELETE CASCADE,
  CONSTRAINT fk_test_target FOREIGN KEY (target_user_id) REFERENCES users (id_user) ON DELETE CASCADE
);
