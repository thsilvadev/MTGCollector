-- Normalize wishlist table structure for qty-based tracking
ALTER TABLE wishlist
  MODIFY COLUMN id_wishlist INT AUTO_INCREMENT PRIMARY KEY,
  MODIFY COLUMN quantity INT DEFAULT 1,
  MODIFY COLUMN card_id VARCHAR(36) NOT NULL,
  MODIFY COLUMN user_id INT NOT NULL,
  ADD UNIQUE KEY unique_wishlist_card (card_id, user_id),
  ADD CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users (id_user) ON DELETE CASCADE;
