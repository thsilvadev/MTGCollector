import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from '../styles/Collection.module.css';
import deckColorsImg from '../images/deckColorsImg.jpg';
import Card from '../components/Card';
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
  const [totalCost, setTotalCost] = useState('0.00');
  const _superParamsTimer = useRef(null);
  const scrollbarsRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Deck state
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(0);
  const [deckCards, setDeckCards] = useState([]);
  const [deckToggler, setDeckToggler] = useState(false);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isSideboardDragOver, setIsSideboardDragOver] = useState(false);

  const uponDraggingItem = isDraggedOver
    ? styles.UponDraggedItem
    : styles.deckContainer;

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
        setTotalCost(response.data.totalCost || '0.00');
      } else {
        setWishlistItems(prev => [...prev, ...(response.data.items || [])]);
        setTotalCost(response.data.totalCost || '0.00');
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
    if (value !== 'Default') {
      setSelectedDeck(value);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else {
      setSelectedDeck(0);
    }
  };

  // Infinite scroll handler
  const handleScrollFrame = (values) => {
    const { scrollLeft, scrollWidth, clientWidth } = values;
    setScrollLeft(scrollLeft);

    if (scrollWidth - scrollLeft - clientWidth < 500 && !isLoadingMore && !isLoading) {
      setPage(prev => prev + 1);
    }
  };

  const handleHorizontalScroll = (event) => {
    if (event.deltaY !== 0) {
      event.preventDefault();
      if (scrollbarsRef.current && scrollbarsRef.current.view) {
        scrollbarsRef.current.view.scrollLeft += event.deltaY;
      }
    }
  };

  // Drag handlers for deck
  const handleDragEnter = () => {
    setIsDraggedOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggedOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.currentTarget.id === 'lower') {
      setIsDraggedOver(true);
    } else {
      setIsDraggedOver(false);
    }
  };

  const handleDrop = (e) => {
    setIsDraggedOver(false);
    setIsSideboardDragOver(false);

    const pickedCard = e.dataTransfer.getData('card');
    if (pickedCard && selectedDeck && selectedDeck !== 0 && selectedDeck !== 'Default') {
      addWishlistCardToDeck(pickedCard);
    }
  };

  const handleSideboardDrop = (e) => {
    e.stopPropagation();
    setIsSideboardDragOver(false);
    // Wishlist doesn't support sideboard, just main deck
  };

  // Add card to deck (can be called from Card component or drag/drop)
  const addWishlistCardToDeck = async (id_card) => {
    if (!selectedDeck || selectedDeck === 0 || selectedDeck === 'Default') {
      toast.error(t('collection.selectDeckFirst') || 'Please select a deck first');
      return;
    }

    try {
      await Api.post(
        `/eachDeck/`,
        { id_card, deck: selectedDeck, sideboard: false },
        config
      );
      toast.success(t('collection.cardAdded') || 'Card added to deck');
      setDeckToggler(t => !t);
    } catch (error) {
      console.error('Failed to add card to deck:', error);
      toast.error(error.response?.data?.error || 'Failed to add card to deck');
    }
  };

  // Deck color handling
  const handleDeckColor = () => {
    const uniqueColorIdentities = new Set();

    deckCards.forEach((card) => {
      if (card && typeof card.colorIdentity === 'string') {
        const colors = card.colorIdentity.trim().split(', ');
        colors.forEach((color) => {
          uniqueColorIdentities.add(color);
        });
      }
    });

    const uniqueColorsArray = Array.from(uniqueColorIdentities);
    return getDeckNotation(uniqueColorsArray);
  };

  function getDeckNotation(deckColors) {
    const colorCombinations = {
      MonoGreen: ['G'],
      MonoRed: ['R'],
      MonoBlue: ['U'],
      MonoWhite: ['W'],
      MonoBlack: ['B'],
      Azorius: ['U', 'W'],
      Boros: ['R', 'W'],
      Dimir: ['U', 'B'],
      Golgari: ['B', 'G'],
      Gruul: ['R', 'G'],
      Izzet: ['U', 'R'],
      Orzhov: ['W', 'B'],
      Rakdos: ['R', 'B'],
      Selesnya: ['W', 'G'],
      Simic: ['U', 'G'],
      Abzan: ['W', 'B', 'G'],
      Bant: ['W', 'U', 'G'],
      Esper: ['W', 'U', 'B'],
      Grixis: ['U', 'B', 'R'],
      Jeskai: ['W', 'U', 'R'],
      Jund: ['B', 'R', 'G'],
      Mardu: ['W', 'B', 'R'],
      Naya: ['W', 'R', 'G'],
      Sultai: ['U', 'B', 'G'],
      Temur: ['U', 'R', 'G'],
      Dune: ['W', 'B', 'R', 'G'],
      Glint: ['U', 'B', 'R', 'G'],
      Ink: ['W', 'U', 'R', 'G'],
      Witch: ['W', 'U', 'B', 'G'],
      Yore: ['W', 'U', 'B', 'R'],
      FiveColored: ['W', 'U', 'B', 'R', 'G'],
    };

    let bestMatch = '';

    for (const deck in colorCombinations) {
      const colors = colorCombinations[deck];
      let isMatch = true;

      for (const color of colors) {
        if (!deckColors.includes(color)) {
          isMatch = false;
          break;
        }
      }

      if (isMatch && colors.length >= bestMatch.split(', ').length) {
        bestMatch = deck;
      }
    }

    return bestMatch;
  }

  let deckColorDefined = useMemo(() => handleDeckColor(), [deckCards]);

  // Main deck vs sideboard separation
  const mainDeckCards = useMemo(() => deckCards.filter(c => !c.sideboard), [deckCards]);
  const sideboardCards = useMemo(() => deckCards.filter(c => c.sideboard), [deckCards]);

  // Organize main deck by mana value
  const manaValueArrays = Array.from({ length: 7 }, () => []);
  const landCards = [];

  mainDeckCards.forEach((card) => {
    if (card.types.includes('Land')) {
      landCards.push(card);
    } else if (card.manaValue <= 1) {
      manaValueArrays[0].push(card);
    } else if (card.manaValue <= 5) {
      manaValueArrays[card.manaValue - 1].push(card);
    } else {
      manaValueArrays[5].push(card);
    }
  });

  // Organize sideboard by mana value
  const sideboardManaArrays = Array.from({ length: 7 }, () => []);
  const sideboardLandCards = [];

  sideboardCards.forEach((card) => {
    if (card.types.includes('Land')) {
      sideboardLandCards.push(card);
    } else if (card.manaValue <= 1) {
      sideboardManaArrays[0].push(card);
    } else if (card.manaValue <= 5) {
      sideboardManaArrays[card.manaValue - 1].push(card);
    } else {
      sideboardManaArrays[5].push(card);
    }
  });

  // Deck size
  const DeckSize = useMemo(() => {
    if (!selectedDeck) return '';
    return mainDeckCards.reduce((sum, c) => sum + c.countById, 0);
  }, [mainDeckCards, selectedDeck]);

  const SideboardSize = useMemo(
    () => sideboardCards.reduce((sum, c) => sum + c.countById, 0),
    [sideboardCards]
  );

  const RenderedDeckSize = DeckSize > 0 ? `${DeckSize} Cards` : '';

  // Check if commander mode is enabled for this deck
  const selectedDeckInfo = useMemo(() => {
    if (!selectedDeck || selectedDeck === 0 || selectedDeck === 'Default') return null;
    return decks.find(d => d.id_deck.toString() === selectedDeck.toString()) || null;
  }, [decks, selectedDeck]);

  const isCommanderDeck = Boolean(selectedDeckInfo?.isCommander);
  const commanderName = selectedDeckInfo?.commanderName || null;

  return (
    <div className={styles.Background}>
      <div>
        <h1 className={styles.title}>
          {t('wishlist.title') || 'My Wishlist'}
          {totalCost && parseFloat(totalCost) > 0 && (
            <span style={{ fontSize: '0.6em', marginLeft: '8px', opacity: 0.7 }}>
              (${totalCost})
            </span>
          )}
        </h1>

        <SearchContainer
          baseOfSearch="wishlist"
          onParamsChange={handleSuperParams}
          isLoading={isLoading}
        />

        <div className={styles.cardsContainer}>
          <Scrollbars
            ref={scrollbarsRef}
            style={{ width: '90%', height: '100%' }}
            onScrollFrame={handleScrollFrame}
          >
            <div
              className={`d-flex flex-nowrap ${styles.cardsRow}`}
              onWheel={handleHorizontalScroll}
              scrollLeft={scrollLeft}
            >
              {wishlistItems.map((item) => (
                <Card
                  key={item.id_wishlist}
                  id={item.id_wishlist}
                  multiverseId={item.multiverseId || 0}
                  scryfallId={item.card_id}
                  name={item.name}
                  types={item.types}
                  keywords={item.keywords || ''}
                  count={item.qty}
                  table="collection"
                  id_collection={item.id_wishlist}
                  refresh={() => { setPage(0); fetchWishlist(); }}
                  getChosenDeck={selectedDeck}
                  getDeckCards={deckCards}
                  getCollectionCards={wishlistItems}
                  prices={item.prices || {}}
                  isCommanderDeck={isCommanderDeck}
                  commanderColorIdentity={selectedDeckInfo?.commanderColors || ''}
                  onAddToDeck={(cardId) => addWishlistCardToDeck(item.id_wishlist)}
                  isWishlist={true}
                />
              ))}
              {isLoadingMore && (
                <div className={styles.scrollLoader}>
                  <span>···</span>
                </div>
              )}
            </div>
          </Scrollbars>
        </div>
      </div>

      {/* Deck container - copied from Collection */}
      <div
        className={uponDraggingItem}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        id="lower"
      >
        <div className={styles.selectDeck}>
          <div id="lol" className={styles.even}>
            <span className={styles.DeckColor}>{deckColorDefined}</span>
            <div className={styles.hide}>
              <img
                src={deckColorsImg}
                width="250"
                alt="a list of all color combination names"
              />
            </div>
          </div>

          <div className={styles.odd}>
            <select
              defaultValue={'Default'}
              value={selectedDeck}
              className={styles.selectInput}
              onChange={handleDeckChange}
              aria-label="Default select example"
            >
              <option value="Default">{t('collection.selectDeck')}</option>
              {decks.map((deck, key) => (
                <option key={key} value={deck.id_deck}>
                  {deck.name}
                </option>
              ))}
            </select>
          </div>

          <div id="3" className={styles.even}>
            <div className={styles.deckSizeWrapper}>
              <span className={styles.Normal}>{RenderedDeckSize}</span>
            </div>
          </div>

          <div>
            <a href="/decks">
              <button className={styles.newDeckButton}>{t('collection.addNewDeck')}</button>
            </a>
          </div>

          {selectedDeck && selectedDeck !== 0 && selectedDeck !== 'Default' && (
            <div className={styles.commanderRow}>
              <label className={styles.commanderLabel}>
                <span className={styles.commanderToggleSwitch}>
                  <input
                    type="checkbox"
                    checked={isCommanderDeck}
                    disabled
                  />
                  <span
                    className={
                      isCommanderDeck
                        ? `${styles.commanderToggleSlider} ${styles.commanderToggleSliderOn}`
                        : styles.commanderToggleSlider
                    }
                  />
                </span>
                {t('commander.toggle')}
              </label>
              {isCommanderDeck && commanderName && (
                <span className={styles.commanderNameTag}>★ {commanderName}</span>
              )}
            </div>
          )}
        </div>

        <div className={styles.deckBodyWrapper}>
          {/* ── Main deck columns ── */}
          <div className={styles.minicardsContainer}>
            {manaValueArrays.map(
              (manaArray, index) =>
                manaArray.length > 0 && (
                  <div className={styles.minicardsCol} key={index}>
                    {manaArray
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((deckCard, key) => (
                        <MiniCard
                          key={key}
                          id={deckCard.id}
                          cost={deckCard.manaCost}
                          name={deckCard.name}
                          table="deck"
                          id_collection={deckCard.id_collection}
                          id_constructed={deckCard.id_constructed}
                          count={deckCard.countById}
                          isModalOpen={true}
                          toggle={() => setDeckToggler((t) => !t)}
                          scryfallId={deckCard.scryfallId}
                          types={deckCard.types}
                          keywords={deckCard.keywords}
                          supertypes={deckCard.supertypes}
                          inCollection={deckCard.inCollection}
                          isCommanderDeck={isCommanderDeck}
                          isTheCommander={deckCard.name === commanderName}
                        />
                      ))}
                  </div>
                )
            )}
            <div className={styles.minicardsCol}>
              {landCards.map((deckCard, key) => (
                <MiniCard
                  key={key}
                  id={deckCard.id}
                  cost={deckCard.manaCost}
                  name={deckCard.name}
                  table="deck"
                  id_collection={deckCard.id_collection}
                  id_constructed={deckCard.id_constructed}
                  count={deckCard.countById}
                  isModalOpen={true}
                  toggle={() => setDeckToggler((t) => !t)}
                  scryfallId={deckCard.scryfallId}
                  types={deckCard.types}
                  keywords={deckCard.keywords}
                  supertypes={deckCard.supertypes}
                  inCollection={deckCard.inCollection}
                  isCommanderDeck={isCommanderDeck}
                  isTheCommander={deckCard.name === commanderName}
                />
              ))}
            </div>
          </div>

          {/* ── Sideboard ── */}
          <div
            id="sideboard"
            className={isSideboardDragOver ? styles.sideboardSectionOver : styles.sideboardSection}
            onDrop={handleSideboardDrop}
            onDragOver={(e) => { e.preventDefault(); setIsSideboardDragOver(true); }}
            onDragEnter={() => setIsSideboardDragOver(true)}
            onDragLeave={() => setIsSideboardDragOver(false)}
          >
            <div className={styles.sideboardHeader}>
              <span>{t('collection.sideboard')}</span>
              <span className={styles.sideboardCount}> · {SideboardSize} / 15</span>
            </div>
            <div className={styles.minicardsContainer}>
              {sideboardManaArrays.map(
                (manaArray, index) =>
                  manaArray.length > 0 && (
                    <div className={styles.minicardsCol} key={index}>
                      {manaArray
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((deckCard, key) => (
                          <MiniCard
                            key={key}
                            id={deckCard.id}
                            cost={deckCard.manaCost}
                            name={deckCard.name}
                            table="deck"
                            isSideboard={true}
                            id_collection={deckCard.id_collection}
                            id_constructed={deckCard.id_constructed}
                            count={deckCard.countById}
                            isModalOpen={true}
                            toggle={() => setDeckToggler((t) => !t)}
                            scryfallId={deckCard.scryfallId}
                            types={deckCard.types}
                            keywords={deckCard.keywords}
                            supertypes={deckCard.supertypes}
                            inCollection={deckCard.inCollection}
                            isCommanderDeck={isCommanderDeck}
                          />
                        ))}
                    </div>
                  )
              )}
              {sideboardLandCards.length > 0 && (
                <div className={styles.minicardsCol}>
                  {sideboardLandCards.map((deckCard, key) => (
                    <MiniCard
                      key={key}
                      id={deckCard.id}
                      cost={deckCard.manaCost}
                      name={deckCard.name}
                      table="deck"
                      isSideboard={true}
                      id_collection={deckCard.id_collection}
                      id_constructed={deckCard.id_constructed}
                      count={deckCard.countById}
                      isModalOpen={true}
                      toggle={() => setDeckToggler((t) => !t)}
                      scryfallId={deckCard.scryfallId}
                      types={deckCard.types}
                      keywords={deckCard.keywords}
                      supertypes={deckCard.supertypes}
                      inCollection={deckCard.inCollection}
                      isCommanderDeck={isCommanderDeck}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Wishlist;