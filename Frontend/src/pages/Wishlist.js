import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/Collection.module.css';
import Axios from 'axios';
import { useAuthHeader } from 'react-auth-kit';
import { useI18n } from '../i18n/LanguageContext';
import { toast } from 'react-toastify';
import { Scrollbars } from 'react-custom-scrollbars-2';
import Card from '../components/Card';
import SearchContainer from '../components/SearchContainer';
import MiniCard from '../components/MiniCard';

function Wishlist() {
  const { t } = useI18n();
  const authHeader = useAuthHeader();
  const config = { headers: { Authorization: authHeader() } };

  const [wishlistItems, setWishlistItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [superParams, setSuperParams] = useState('');
  const _superParamsTimer = useRef(null);
  const [selectedCard, setSelectedCard] = useState(null);

  const handleSuperParams = (paramsData) => {
    clearTimeout(_superParamsTimer.current);
    _superParamsTimer.current = setTimeout(() => {
      setSuperParams(paramsData);
    }, 300);
  };

  // Fetch wishlist items
  useEffect(() => {
    fetchWishlist();
  }, [page]);

  const fetchWishlist = async () => {
    try {
      setIsLoading(true);
      const response = await Axios.get(
        `${window.name}/wishlist?page=${page}`,
        config
      );
      setWishlistItems(response.data.items || []);
      setTotalItems(response.data.items?.length || 0);
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
      toast.error(t('wishlist.error') || 'Failed to load wishlist');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle qty update
  const handleQtyChange = async (id_wishlist, newQty) => {
    try {
      if (newQty < 0 || newQty > 4) {
        toast.error(t('wishlist.qtyError') || 'Quantity must be 0-4');
        return;
      }

      if (newQty === 0) {
        // Delete
        await Axios.delete(`${window.name}/wishlist/${id_wishlist}`, config);
        toast.success(t('wishlist.removed') || 'Card removed from wishlist');
      } else {
        // Update
        await Axios.put(
          `${window.name}/wishlist/${id_wishlist}`,
          { qty: newQty },
          config
        );
        toast.success(t('wishlist.updated') || 'Wishlist updated');
      }
      fetchWishlist();
    } catch (err) {
      console.error('Failed to update wishlist:', err);
      toast.error(err.response?.data?.error || 'Failed to update wishlist');
    }
  };

  // Filter wishlist based on search params
  const filteredWishlist = superParams
    ? wishlistItems.filter((item) => {
        const name = (item.name || '').toLowerCase();
        const search = superParams.toLowerCase();
        return name.includes(search);
      })
    : wishlistItems;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{t('wishlist.title') || 'My Wishlist'}</h1>
        <p className={styles.totalText}>
          {filteredWishlist.length} {t('wishlist.items') || 'items'}
        </p>
      </div>

      {/* Search Bar */}
      <SearchContainer handleSuperParams={handleSuperParams} />

      {/* Wishlist Display */}
      <div className={styles.content}>
        <Scrollbars>
          {isLoading ? (
            <p>{t('search.loading') || 'Loading...'}</p>
          ) : filteredWishlist.length === 0 ? (
            <p className={styles.emptyMessage}>
              {t('wishlist.empty') || 'Your wishlist is empty'}
            </p>
          ) : (
            <div className={styles.cardsGrid}>
              {filteredWishlist.map((item) => (
                <div
                  key={item.id_wishlist}
                  className={styles.wishlistCardWrapper}
                  style={{ backgroundColor: '#E6E6FA' }}
                >
                  <MiniCard
                    name={item.name}
                    imageUrl={item.imageUrl}
                    onClick={() => setSelectedCard(item)}
                  />
                  <div className={styles.wishlistQtyControl}>
                    <label>{t('wishlist.quantity') || 'Qty'}:</label>
                    <div className={styles.qtyButtons}>
                      <button
                        onClick={() => handleQtyChange(item.id_wishlist, item.qty - 1)}
                        disabled={item.qty <= 0}
                      >
                        −
                      </button>
                      <span className={styles.qtyDisplay}>{item.qty}</span>
                      <button
                        onClick={() => handleQtyChange(item.id_wishlist, item.qty + 1)}
                        disabled={item.qty >= 4}
                      >
                        +
                      </button>
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={() => handleQtyChange(item.id_wishlist, 0)}
                    >
                      {t('wishlist.remove') || 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Scrollbars>
      </div>

      {/* Card Detail (if selected) */}
      {selectedCard && (
        <Card
          name={selectedCard.name}
          imageUrl={selectedCard.imageUrl}
          colorIdentity={selectedCard.colorIdentity}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}

export default Wishlist;