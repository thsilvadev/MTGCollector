CREATE DATABASE IF NOT EXISTS mtgchest;
USE mtgchest;

CREATE TABLE IF NOT EXISTS users (
  id_user   INT          AUTO_INCREMENT PRIMARY KEY,
  email     VARCHAR(45)  NOT NULL UNIQUE,
  password  VARCHAR(200) NOT NULL,
  confirmed VARCHAR(200) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS collection (
  id_collection  INT          AUTO_INCREMENT PRIMARY KEY,
  card_id        VARCHAR(36)  NOT NULL,
  card_condition VARCHAR(255),
  user_id        INT          NOT NULL,
  CONSTRAINT fk_collection_user FOREIGN KEY (user_id) REFERENCES users (id_user)
);

CREATE TABLE IF NOT EXISTS decks (
  id_deck     INT          AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255),
  color       VARCHAR(255),
  description VARCHAR(255),
  format      VARCHAR(20),
  card_count  INT          DEFAULT 0,
  user_id     INT          NOT NULL,
  CONSTRAINT fk_decks_user FOREIGN KEY (user_id) REFERENCES users (id_user)
);

CREATE TABLE IF NOT EXISTS deck (
  id_constructed INT AUTO_INCREMENT PRIMARY KEY,
  id_card        INT NOT NULL,
  deck           INT NOT NULL,
  user_id        INT NOT NULL,
  CONSTRAINT fk_deck_collection FOREIGN KEY (id_card)  REFERENCES collection (id_collection) ON DELETE CASCADE,
  CONSTRAINT fk_deck_decks      FOREIGN KEY (deck)     REFERENCES decks (id_deck)             ON DELETE CASCADE,
  CONSTRAINT fk_deck_user       FOREIGN KEY (user_id)  REFERENCES users (id_user)
);

CREATE TABLE IF NOT EXISTS wishlist (
  id_wishlist   INT         NOT NULL,
  card_id       VARCHAR(36),
  quantity      INT,
  in_collection INT         NOT NULL DEFAULT 0,
  user_id       INT,
  CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users (id_user)
);
