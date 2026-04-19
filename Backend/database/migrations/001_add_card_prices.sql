-- Migration: 001_add_card_prices
-- Purpose: Add global card price cache table and migration tracking table.
-- Safe to run on existing databases (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS card_prices (
  card_id    VARCHAR(36)   NOT NULL PRIMARY KEY,
  usd        DECIMAL(10,4),
  updated_at DATETIME      NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  name    VARCHAR(255) NOT NULL PRIMARY KEY,
  run_at  DATETIME     NOT NULL
);
