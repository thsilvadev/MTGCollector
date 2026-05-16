-- Migration: 003_add_user_profile
-- Adds name and game_tag to the users table (idempotent).

-- Add 'name' column if not present
SET @col_name_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'users'
    AND COLUMN_NAME  = 'name'
);
SET @sql_name = IF(
  @col_name_exists > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN name VARCHAR(50) DEFAULT NULL AFTER email'
);
PREPARE stmt FROM @sql_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add 'game_tag' column if not present
SET @col_tag_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'users'
    AND COLUMN_NAME  = 'game_tag'
);
SET @sql_tag = IF(
  @col_tag_exists > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN game_tag VARCHAR(60) DEFAULT NULL AFTER name'
);
PREPARE stmt FROM @sql_tag;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add unique index on game_tag if not present
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'users'
    AND INDEX_NAME   = 'uq_game_tag'
);
SET @sql_idx = IF(
  @idx_exists > 0,
  'SELECT 1',
  'ALTER TABLE users ADD UNIQUE INDEX uq_game_tag (game_tag)'
);
PREPARE stmt FROM @sql_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
