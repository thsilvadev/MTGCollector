-- Migration: 003_add_user_profile
-- Adds name and game_tag to the users table.
-- game_tag format: {name}#{6-digit-number}, must be unique.

ALTER TABLE users
  ADD COLUMN name     VARCHAR(50)  DEFAULT NULL AFTER email,
  ADD COLUMN game_tag VARCHAR(60)  DEFAULT NULL AFTER name;

ALTER TABLE users
  ADD UNIQUE INDEX uq_game_tag (game_tag);
