import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/Collection.module.css';
import deckColorsImg from '../images/deckColorsImg.jpg';
import Api from '../Api';
import { useAuthHeader } from 'react-auth-kit';
import { useI18n } from '../i18n/LanguageContext';
import { toast } from 'react-toastify';
import { Scrollbars } from 'react-custom-scrollbars-2';
import MiniCard from '../components/MiniCard';
import SearchContainer from '../components/SearchContainer';

function Wishlist() {
  const { t } = useI18n();
  const authHeader = useAuthHeader();
  const config = { headers: { Authorization: authHeader() } };

  // Wishlist state
  const [wishlistItems, setWishlistItems] = useState([]);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [superParams, setSuperParams] = useState('');
  const _superParamsTimer = useRef(null);

  // Deck state
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(0);
  const [deckCards, setDeckCards] = useState([]);
  const [deckToggler, setDeckToggler] = useState(false);

  const handleSuperParams = (paramsData) => {
    clearTimeout(_superParamsTimer.current);
    _superParamsTimer.current = setTimeout(() => {
      setSuperParams(paramsData);
      setPage(0);
    }, 300);
  };

  // Fetch wishlist items
  useEffect(() => {
    fetchWishlist();
  }, [page, superParams]);

  const fetchWishlist = async () => {
    try {
      if (page === 0) setIsLoading(true);
      else setIsLoadingMore(true);

      const response = await Api.get(
        `/wishlist?page=${page}&${superParams}`,
        config
      );
      
      if (page === 0) {
        setWishlistItems(response.data.items || []);
      } else {
        setWishlistItems(prev => [...prev, ...(response.data.items || [])]);
      }
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
      toast.error(t('wishlist.error') || 'Failed to load wishlist');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Fetch decks
  useEffect(() => {
    Api.get(`/decks/0`, config)
      .then((response) => setDecks(response.data))
      .catch(console.error);
  }, []);

  // Fetch deck cards when deck is selected
  useEffect(() => {
    if (selectedDeck && selectedDeck !== 0 && selectedDeck !== 'Default') {
      Api.get(`/eachDeck/${selectedDeck}`, config)
        .then((response) => {
          setDeckCards(response.data);
        })
        .catch(console.error);
    } else {
      setDeckCards([]);
    }
  }, [selectedDeck, deckToggler]);

  // Handle deck selection change
  const handleDeckChange = (event) => {
    const value = event.target.value;
    setSelectedDeck(value === 'Default' ? 0 : value);
  };

  // Handle qty update for wishlist
  const handleQtyChange = async (id_wishlist, newQty) => {
    try {
      if (newQty < 0 || newQty > 4) {
        toast.error(t('wishlist.qtyError') || 'Quantity must be 0-4');
        return;
      }

      if (newQty === 0) {
        await Api.delete(`/wishlist/${id_wishlist}`, config);
        toast.success(t('wishlist.removed') || 'Card removed from wishlist');
      } else {
        await Api.put(
          `/wishlist/${id_wishlist}`,
          { qty: newQty },
          config
        );
        toast.success(t('wishlist.updated') || 'Wishlist updated');
      }
      setPage(0);
      fetchWishlist();
    } catch (err) {
      console.error('Failed to update wishlist:', err);
      toast.error(err.response?.data?.error || 'Failed to update wishlist');
    }
  };

  // Add card from wishlist to deck
  const addWishlistCardToDeck = async (wishlistItem) => {
    if (!selectedDeck || selectedDeck === 0 || selectedDeck === 'Default') {
      toast.error(t('collection.selectDeckFirst') || 'Please select a deck first');
      return;
    }

    try {
      await Api.post(
        `/eachDeck/`,
        { id_card: wishlistItem.card_id, deck: selectedDeck, sideboard: false },
        config
      );
      toast.success(t('collection.cardAdded') || 'Card added to deck');
      setDeckToggler(t => !t);
    } catch (error) {
      console.error('Failed to add card to deck:', error);
      toast.error(error.response?.data?.error || 'Failed to add card to deck');
    }
  };

  return (
    <div className={styles.container}>
      {/* Top section: Wishlist cards */}
      <div>
        <div className={styles.header}>
          <h1>{t('wishlist.title') || 'My Wishlist'}</h1>
        </div>

        <SearchContainer
          baseOfSearch="wishlist"
          onParamsChange={handleSuperParams}
          isLoading={isLoading}
        />

        <div className={styles.cardsContainer}>
          <Scrollbars style={{ width: '90%', height: '100%' }}>
            <div className={`d-flex flex-wrap ${styles.cardsRow}`}>
              {isLoading ? (
                <p>{t('search.loading') || 'Loading...'}</p>
              ) : wishlistItems.length === 0 ? (
                <p className={styles.emptyMessage}>
                  {t('wishlist.empty') || 'Your wishlist is empty'}
                </p>
              ) : (
                wishlistItems.map((item) => (
                  <div
                    key={item.id_wishlist}
                    style={{ marginBottom: '16px', position: 'relative' }}
                    onClick={() => addWishlistCardToDeck(item)}
                    title={t('wishlist.clickToAdd') || 'Click to add to selected deck'}
                  >
                    <MiniCard
                      name={item.name}
                      scryfallId={item.card_id}
                      table="collection"
                      cost=""
                      types={item.types}
                      isModalOpen={true}
                      keywords=""
                      count={item.qty}
                    />
                    {/* Qty badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        backgroundColor: '#FFD700',
                        color: '#000',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        zIndex: 10,
                      }}
                    >
                      {item.qty}x
                    </div>
                  </div>
                ))
              )}
              {isLoadingMore && <div style={{ padding: '16px' }}>···</div>}
            </div>
          </Scrollbars>
        </div>
      </div>

      {/* Bottom section: Deck selector and display */}
      <div
        className={styles.selectDeck}
        style={{
          marginTop: '20px',
          borderTop: '1px solid #ccc',
          paddingTop: '20px',
        }}
      >
        <div className={styles.odd}>
          <span>{t('collection.selectDeck') || 'Select a deck'}:</span>
          <select
            defaultValue="Default"
            value={selectedDeck}
            className={styles.selectInput}
            onChange={handleDeckChange}
          >
            <option value="Default">{t('collection.selectDeck')}</option>
            {decks.map((deck, key) => (
              <option key={key} value={deck.id_deck}>
                {deck.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <a href="/decks">
            <button className={styles.newDeckButton}>
              {t('collection.addNewDeck')}
            </button>
          </a>
        </div>
      </div>

      {/* Deck cards display */}
      {selectedDeck && selectedDeck !== 0 && selectedDeck !== 'Default' && (
        <div className={styles.deckBodyWrapper} style={{ marginTop: '20px' }}>
          <div className={styles.minicardsContainer}>
            {deckCards.length > 0 ? (
              deckCards.map((card) => (
                <div key={card.id_constructed} style={{ marginBottom: '8px' }}>
                  <MiniCard
                    id={card.id}
                    name={card.name}
                    scryfallId={card.scryfallId}
                    table="deck"
                    cost={card.manaCost}
                    types={card.types}
                    count={card.countById}
                    isModalOpen={true}
                    toggle={() => setDeckToggler(t => !t)}
                    id_constructed={card.id_constructed}
                    keywords={card.keywords}
                  />
                </div>
              ))
            ) : (
              <p>{t('collection.emptyDeck') || 'No cards in this deck'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Wishlist;