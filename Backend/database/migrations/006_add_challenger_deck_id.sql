-- Migration 006: Add challenger_deck_id to battles (idempotent)

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'battles'
    AND COLUMN_NAME  = 'challenger_deck_id'
);
SET @sql = IF(
  @col_exists > 0,
  'SELECT 1',
  'ALTER TABLE battles ADD COLUMN challenger_deck_id INT NULL AFTER deck_id, ADD CONSTRAINT fk_bat_ch_deck FOREIGN KEY (challenger_deck_id) REFERENCES decks (id_deck) ON DELETE SET NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
