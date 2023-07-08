CREATE TABLE supercards AS
SELECT
  c.id,
  c.name,
  c.types,
  c.setCode,
  c.manaCost,
  c.manaValue,
  c.rarity,
  c.uuid,
  c.colorIdentity,
  c.keywords,
  ci.multiverseId,
  ci.scryfallId
FROM
  cards c
LEFT JOIN
  cardidentifiers ci ON c.uuid = ci.uuid;

CREATE TABLE `Collection` (
  `id_collection` int PRIMARY KEY NOT NULL,
  `card_id` int,
  `condition` varchar(255)
);

CREATE TABLE `Wishlist` (
  `id_wishlist` int PRIMARY KEY NOT NULL,
  `card_id` int,
  `quantity` int,
  `in_collection` int NOT NULL
);

CREATE TABLE `Decks` (
  `id_deck` int PRIMARY KEY NOT NULL,
  `name` varchar(255),
  `color` varchar(255),
  `description` varchar(255),
  `card_count` int
);

CREATE TABLE `Deck` (
  `id_constructed` int PRIMARY KEY NOT NULL,
  `id_card` int,
  `deck` int
);

ALTER TABLE `Collection` ADD FOREIGN KEY (`card_id`) REFERENCES `supercards` (`id`);

ALTER TABLE `Wishlist` ADD FOREIGN KEY (`card_id`) REFERENCES `supercards` (`id`);

ALTER TABLE `Deck` ADD FOREIGN KEY (`id_card`) REFERENCES `Collection` (`id_collection`);

ALTER TABLE `Deck` ADD FOREIGN KEY (`deck`) REFERENCES `Decks` (`id_deck`);
