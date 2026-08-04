-- Normalize wishlist table structure for qty-based tracking
-- First, drop existing FK constraint (exists from init.sql)
ALTER TABLE wishlist
  DROP FOREIGN KEY fk_wishlist_user;

-- Modify table structure (make columns NOT NULL, add AUTO_INCREMENT)
ALTER TABLE wishlist
  MODIFY COLUMN id_wishlist INT AUTO_INCREMENT PRIMARY KEY,
  MODIFY COLUMN quantity INT DEFAULT 1,
  MODIFY COLUMN card_id VARCHAR(36) NOT NULL,
  MODIFY COLUMN user_id INT NOT NULL;

-- Add unique constraint for (card_id, user_id) pair
ALTER TABLE wishlist
  ADD UNIQUE KEY unique_wishlist_card (card_id, user_id);

-- Re-add FK constraint with ON DELETE CASCADE
ALTER TABLE wishlist
  ADD CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users (id_user) ON DELETE CASCADE;
