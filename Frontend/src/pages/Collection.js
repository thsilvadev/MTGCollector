//styles
import styles from "../styles/Collection.module.css";

//imgs
import deckColorsImg from "../images/deckColorsImg.jpg";

//Imports

import Card from "../components/Card";

import SearchContainer from "../components/SearchContainer";

import Axios from "axios";

import React, { useMemo, useState, useEffect, useRef } from "react";

import { Scrollbars } from "react-custom-scrollbars-2";

import { useAuthHeader } from "react-auth-kit";

import MiniCard from "../components/MiniCard";
import { useLocation } from "react-router-dom";
import { useI18n } from "../i18n/LanguageContext";
import { toast } from "react-toastify";
import { standardRules, commanderRules, parseColorIdentity } from '../utils/deckRules';

//Component

function Collection() {
  const { t } = useI18n();
  //On Decks page, clicking on a deck will bring the user up here in Collection and automatically selects clicked deck, showing it´s cards.
  /**/ const location = useLocation();
  /**/ const searchParams = new URLSearchParams(location.search);

  /**/ // Get the value of the 'selected' query parameter
  /**/ const selected = searchParams.get("selected");

  //Collection cards
  const [cards, setCards] = useState([]);

  //Page value for Collection cards
  const [page, setPage] = useState(0);

  //get Params for Search Container.
  const [superParams, setSuperParams] = useState("");
  const _superParamsTimer = useRef(null);
  const handleSuperParams = (paramsData) => {
    clearTimeout(_superParamsTimer.current);
    _superParamsTimer.current = setTimeout(() => {
      setSuperParams(paramsData);
    }, 300);
  };

  //Total cards in collection
  const [totalCards, setTotalCards] = useState(0);

  //Total USD value of the entire collection
  const [networth, setNetworth] = useState(null);

  //Loading state for search
  const [isLoading, setIsLoading] = useState(false);

  //Handle Droppable
  const [isDroppable, setIsDroppable] = useState(true);

  //Debounced toggle refresher
  const [refresherToggler, setRefresherToggler] = useState(false);

  // Debouncer
  const debounce = (func, delay) => {
    let timerId;

    return (...args) => {
      clearTimeout(timerId);

      timerId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  const handleRefresherToggler = debounce(() => {
    setRefresherToggler((prevRefresh) => !prevRefresh);
    console.log(`WOW: ${refresherToggler}`);
  }, 150);

  // Call comingFromDecks only once when the component mounts
  useEffect(() => {
    comingFromDecks();
  }, []);
  // Deck-only refresh toggler — deck ops use this so the collection scroll is never reset
  const [deckToggler, setDeckToggler] = useState(false);
  //Select Deck coming from Decks page
  const comingFromDecks = () => {
    if (selected !== undefined) {
      setSelectedDeck(selected);
      window.scrollTo({ top: 120, behavior: "smooth" });
      console.log(`selected deck: ${selectedDeck}`);
    }
  };

  //get filtered and paginated Collection Cards in real time

  //Headers configuration
  const authHeader = useAuthHeader();

  const config = {
    headers: {
      authorization: authHeader(),
    },
  };

  // ── Infinite scroll ref ────────────────────────────────────────────────────
  const scrollbarsRef = useRef(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false); // synchronous guard — prevents multi-fire before re-render

  // Effect A: when params/refresher change — reset to page 0 and fetch fresh
  useEffect(() => {
    setIsLoading(true);
    setPage(0);
    Axios.get(`${window.name}/collection/0?${superParams}`, config)
      .then((response) => {
        setTotalCards(response.data.total);
        setCards(response.data.cards);
        if (response.data.networth !== undefined) {
          setNetworth(response.data.networth);
        }
        setIsDroppable(true);
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        if (err?.response?.status === 503) {
          toast.error(t('error.scryfallDown'));
        } else {
          toast.error(t('error.collectionLoad'));
        }
      });
  }, [superParams, refresherToggler]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect B: when page > 0 — append more cards
  useEffect(() => {
    if (page === 0) return;
    setIsLoadingMore(true);
    Axios.get(`${window.name}/collection/${page}?${superParams}`, config)
      .then((response) => {
        setCards((prev) => [...prev, ...response.data.cards]);
        setIsDroppable(true);
        setIsLoadingMore(false);
        isLoadingMoreRef.current = false;
      })
      .catch((err) => {
        setIsLoadingMore(false);
        isLoadingMoreRef.current = false;
        if (err?.response?.status === 503) {
          toast.error(t('error.scryfallDown'));
        } else {
          toast.error(t('error.collectionLoad'));
        }
      });
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Right-edge proximity handler for horizontal infinite scroll
  const handleScrollFrame = (values) => {
    const { scrollLeft: sl, scrollWidth, clientWidth } = values;
    const nearEnd = scrollWidth - clientWidth - sl < 300;
    if (nearEnd && !isLoadingMoreRef.current && !isLoading && cards.length > 0 && cards.length % 40 === 0) {
      isLoadingMoreRef.current = true;
      setPage((p) => p + 1);
    }
  };

  //HORIZONTAL SCROLL

  // Scroll position state
  const [scrollLeft, setScrollLeft] = useState(0);

  // Handle horizontal scroll using the mouse wheel event
  const handleHorizontalScroll = (e) => {
    setScrollLeft(scrollLeft + e.deltaY);
  };

  ///////decksContainer////////
  //Drag handlers

  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isSideboardDragOver, setIsSideboardDragOver] = useState(false);
  const uponDraggingItem = isDraggedOver
    ? styles.UponDraggedItem
    : styles.deckContainer;

  const handleDragEnter = () => {
    setIsDraggedOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggedOver(false);
  };

  const handleDrop = (e) => {
    setIsDraggedOver(false);
    setIsSideboardDragOver(false);

    const pickedCard     = e.dataTransfer.getData("card");          // from collection
    const pickedDeckCard = e.dataTransfer.getData("cardDeletion");   // from main deck
    const pickedSideCard = e.dataTransfer.getData("sideboardCard");  // from sideboard
    const zone = e.currentTarget.id;

    if (zone === "lower") {
      if (pickedCard)     postOnDeck(pickedCard, false);
      else if (pickedSideCard) {
        // Move sideboard card back to main deck
        const card = sideboardCards.find(c => c.id_constructed.toString() === pickedSideCard.toString());
        if (card) moveCard(card.id, false);
      }
    } else if (zone === "upper") {
      if (pickedDeckCard) deleteFromDeck(pickedDeckCard);
      else if (pickedSideCard) deleteFromDeck(pickedSideCard);
    }
  };

  // Drop handler for the sideboard zone (stops propagation to #lower)
  const handleSideboardDrop = (e) => {
    e.stopPropagation();
    setIsSideboardDragOver(false);

    const pickedCard     = e.dataTransfer.getData("card");         // from collection
    const pickedDeckCard = e.dataTransfer.getData("cardDeletion"); // from main deck

    if (pickedCard)     postOnDeck(pickedCard, true);
    else if (pickedDeckCard) {
      // Move main deck card to sideboard
      const card = mainDeckCards.find(c => c.id_constructed.toString() === pickedDeckCard.toString());
      if (card) moveCard(card.id, true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.currentTarget.id === "lower") {
      setIsDraggedOver(true);
    } else {
      setIsDraggedOver(false);
    }
  };

  //make it a dropzone using `e.dataTransfer.getData`

  //postOnDeck
  const postOnDeck = async (collectionId, isSideboard = false) => {
    const chosenDeck = selectedDeck;
    if (!isDroppable) return;

    const collIdStr       = collectionId.toString();
    const onCollectionCard = cards.find((c) => c.id_collection.toString() === collIdStr);

    // Count owned copies
    const owned = onCollectionCard ? onCollectionCard.countById : 0;

    // Count already placed across all 75 (main + sideboard)
    const allPlaced = deckCards
      .filter(c => c.id_card.toString() === collIdStr)
      .reduce((sum, c) => sum + c.countById, 0);

    if (owned - allPlaced <= 0) {
      toast.error("You don't own enough copies of this card to add to the deck!");
      return;
    }

    const cardName  = onCollectionCard ? onCollectionCard.name : null;
    const superType = onCollectionCard ? onCollectionCard.supertypes : null;
    const cardIsLand = onCollectionCard?.types?.includes('Land');

    if (!isSideboard && isCommanderDeck) {
      // Commander: 1-copy rule for non-lands
      if (!cardIsLand) {
        let nameCountInMain = 0;
        mainDeckCards.forEach(card => { if (card.name === cardName) nameCountInMain += card.countById; });
        if (nameCountInMain >= 1) {
          toast.error('Only 1 copy of each card is allowed in Commander!');
          return;
        }
      }
      // Commander: color identity check (only if commander is set)
      if (commanderColorIdentity) {
        const commanderColors = parseColorIdentity(commanderColorIdentity);
        const cardCI = parseColorIdentity(onCollectionCard?.colorIdentity || '');
        if (cardCI.size > 0) {
          const hasOutsideColor = [...cardCI].some(c => !commanderColors.has(c));
          if (hasOutsideColor) {
            toast.error("This card's color identity is outside your commander's colors!");
            return;
          }
        }
      }
    } else {
      // Standard: 4-copy rule within the target partition
      const targetPartition = isSideboard ? sideboardCards : mainDeckCards;
      let nameCounterInTarget = 0;
      targetPartition.forEach((card) => {
        if (card.name === cardName) nameCounterInTarget += card.countById;
      });
      if (nameCounterInTarget >= 4 && superType !== 'Basic') {
        toast.error(`Already have 4 copies of this card in the ${isSideboard ? 'sideboard' : 'deck'}!`);
        return;
      }
    }

    if (isSideboard && SideboardSize >= 15) {
      toast.error('Sideboard is full (max 15 cards)!');
      return;
    }

    try {
      setIsDroppable(false);
      await Axios.post(
        `${window.name}/eachDeck/`,
        { id_card: collectionId, deck: chosenDeck, sideboard: isSideboard },
        config
      ).then(() => setDeckToggler((t) => !t));
    } catch (error) {
      console.error("Failed to add card to deck:", error);
    }
  };

  //Delete from Deck
  const deleteFromDeck = (cardIdConstructed) => {
    if (!isDroppable) return;
    try {
      Axios.delete(`${window.name}/eachDeck/${cardIdConstructed}`, config)
        .then(() => setDeckToggler((t) => !t));
    } catch (error) {
      console.error("Failed to remove card from deck:", error);
    }
  };

  // Move copies of a card between main deck ↔ sideboard
  // qty=null → move all copies (DnD), qty=N → move exactly N copies (modal)
  const moveCard = async (cardScryfallId, toSideboard, qty = null) => {
    try {
      await Axios.put(
        `${window.name}/eachDeck/move`,
        { card_id: cardScryfallId, deck: selectedDeck, sideboard: toSideboard, qty },
        config
      );
      setDeckToggler((t) => !t);
    } catch (error) {
      console.error("Failed to move card:", error);
      toast.error("Failed to move card.");
    }
  };

  // Set exact qty of a card in the deck or sideboard (from MiniCard modal)
  const setDeckCardQty = async (cardScryfallId, newQty, isSideboard = false) => {
    try {
      await Axios.put(`${window.name}/eachDeck/setqty`, {
        card_id: cardScryfallId,
        deck: selectedDeck,
        qty: newQty,
        sideboard: isSideboard,
      }, config);
      setDeckToggler((t) => !t);
    } catch (error) {
      console.error("Failed to set deck card quantity:", error);
      toast.error("Failed to update quantity.");
    }
  };

  // Toggle Commander mode for the selected deck
  const handleCommanderToggle = async () => {
    if (!selectedDeck || selectedDeck === 0 || selectedDeck === 'Default') return;
    const newValue   = isCommanderDeck ? 0 : 1;
    const clearFields = newValue === 0 ? { commanderName: null, commanderColors: null } : {};
    try {
      await Axios.put(`${window.name}/decks/${selectedDeck}`, { isCommander: newValue, ...clearFields }, config);
      setDecks(prev => prev.map(d =>
        d.id_deck.toString() === selectedDeck.toString()
          ? { ...d, isCommander: newValue, ...clearFields }
          : d
      ));
    } catch (error) {
      console.error('Failed to toggle Commander mode:', error);
      toast.error('Failed to update deck format.');
    }
  };

  // Set a card as the deck's commander
  const setDeckCommander = async (card) => {
    if (!selectedDeck) return;
    try {
      await Axios.put(`${window.name}/decks/${selectedDeck}`, {
        commanderName:   card.name,
        commanderColors: card.colorIdentity,
      }, config);
      setDecks(prev => prev.map(d =>
        d.id_deck.toString() === selectedDeck.toString()
          ? { ...d, commanderName: card.name, commanderColors: card.colorIdentity }
          : d
      ));
    } catch (error) {
      console.error('Failed to set commander:', error);
      toast.error('Failed to set commander.');
    }
  };

  //selectDeck

  const [selectedDeck, setSelectedDeck] = useState(0);

  const handleDeckChange = (event) => {
    if (event.target.value !== "Default") {
      setSelectedDeck(event.target.value);
      window.scrollTo({ top: 120, behavior: "smooth" });
      console.log(`selected deckk: ${selectedDeck}`);
    } else {
      setSelectedDeck(0);
    }
  };

  //Decks
  const [decks, setDecks] = useState([]);

  useEffect(() => {
    Axios.get(`${window.name}/decks/0`, config)
      .then((response) => {
        setDecks(response.data);
      })
      .then(console.log("got decks"));
    console.log(selectedDeck, selected);
  }, []);

  //eachDeck

  const [deckCards, setDeckCards] = useState([]);

  useEffect(() => {
    if (selectedDeck) {
      Axios.get(`${window.name}/eachDeck/${selectedDeck}`, config)
        .then((response) => {
          setDeckCards(response.data);
        setIsDroppable(true);
        })
        .then(console.log(`selected deck: ${selectedDeck}`));
    } else {
      setDeckCards([]);
      console.log("no deck selected");
    }
  }, [selectedDeck, deckToggler]);

  //How many cards there are in selected deck?

  // Separate main deck from sideboard
  const mainDeckCards = useMemo(() => deckCards.filter(c => !c.sideboard), [deckCards]);
  const sideboardCards = useMemo(() => deckCards.filter(c => c.sideboard), [deckCards]);

  //Dividing main deck in up to 7 columns

  // Initialize arrays for different categories
  const manaValueArrays = Array.from({ length: 7 }, () => []);
  const landCards = [];

  // Categorize main deck cards into columns
  mainDeckCards.forEach((card) => {
    if (card.types.includes("Land")) {
      landCards.push(card);
    } else if (card.manaValue <= 1) {
      manaValueArrays[0].push(card);
    } else if (card.manaValue <= 5) {
      manaValueArrays[card.manaValue - 1].push(card);
    } else {
      manaValueArrays[5].push(card);
    }
  });

  // Categorize sideboard cards into columns
  const sideboardManaArrays = Array.from({ length: 7 }, () => []);
  const sideboardLandCards = [];

  sideboardCards.forEach((card) => {
    if (card.types.includes("Land")) {
      sideboardLandCards.push(card);
    } else if (card.manaValue <= 1) {
      sideboardManaArrays[0].push(card);
    } else if (card.manaValue <= 5) {
      sideboardManaArrays[card.manaValue - 1].push(card);
    } else {
      sideboardManaArrays[5].push(card);
    }
  });

  // Deck Color Handling

  const handleDeckColor = () => {
    const uniqueColorIdentities = new Set();

    deckCards.forEach((card) => {
      if (card && typeof card.colorIdentity === "string") {
        // Split the colorIdentity string into individual colors (e.g., "G, U" -> ["G", "U"])
        const colors = card.colorIdentity.trim().split(", ");

        // Add each color to the Set to ensure uniqueness
        colors.forEach((color) => {
          uniqueColorIdentities.add(color);
        });
      }
    });

    // Convert the unique colors to an array
    const uniqueColorsArray = Array.from(uniqueColorIdentities);

    // Determine the deck combination name
    const res = getDeckNotation(uniqueColorsArray);
    console.log("deck color: ", res);

    return res;
  };

  function getDeckNotation(deckColors) {
    const colorCombinations = {
      MonoGreen: ["G"],
      MonoRed: ["R"],
      MonoBlue: ["U"],
      MonoWhite: ["W"],
      MonoBlack: ["B"],
      Azorius: ["U", "W"],
      Boros: ["R", "W"],
      Dimir: ["U", "B"],
      Golgari: ["B", "G"],
      Gruul: ["R", "G"],
      Izzet: ["U", "R"],
      Orzhov: ["W", "B"],
      Rakdos: ["R", "B"],
      Selesnya: ["W", "G"],
      Simic: ["U", "G"],
      Abzan: ["W", "B", "G"],
      Bant: ["W", "U", "G"],
      Esper: ["W", "U", "B"],
      Grixis: ["U", "B", "R"],
      Jeskai: ["W", "U", "R"],
      Jund: ["B", "R", "G"],
      Mardu: ["W", "B", "R"],
      Naya: ["W", "R", "G"],
      Sultai: ["U", "B", "G"],
      Temur: ["U", "R", "G"],
      Dune: ["W", "B", "R", "G"],
      Glint: ["U", "B", "R", "G"],
      Ink: ["W", "U", "R", "G"],
      Witch: ["W", "U", "B", "G"],
      Yore: ["W", "U", "B", "R"],
      FiveColored: ["W", "U", "B", "R", "G"],
    };

    let bestMatch = ""; // Initialize with a default value

    // Iterate through each color combination
    for (const deck in colorCombinations) {
      const colors = colorCombinations[deck];
      let isMatch = true;

      // Check if all colors in the combination are present in the deckColors array
      for (const color of colors) {
        if (!deckColors.includes(color)) {
          isMatch = false;
          break;
        }
      }

      // If it's a match and the combination is longer than the current best match
      if (isMatch && colors.length >= bestMatch.split(", ").length) {
        bestMatch = deck;
      }
    }

    return bestMatch;
  }

  let deckColorDefined = useMemo(() => handleDeckColor(), [deckCards]);

  // Commander-mode derived state (depends on decks + selectedDeck)
  const selectedDeckInfo = useMemo(() => {
    if (!selectedDeck || selectedDeck === 0 || selectedDeck === 'Default') return null;
    return decks.find(d => d.id_deck.toString() === selectedDeck.toString()) || null;
  }, [decks, selectedDeck]);
  const isCommanderDeck        = Boolean(selectedDeckInfo?.isCommander);
  const commanderName          = selectedDeckInfo?.commanderName  || null;
  const commanderColorIdentity = selectedDeckInfo?.commanderColors || '';

  let DeckSize = useMemo(() => {
    if (!selectedDeck) return "";
    return mainDeckCards.reduce((sum, c) => sum + c.countById, 0);
  }, [mainDeckCards, selectedDeck]);

  const SideboardSize = useMemo(
    () => sideboardCards.reduce((sum, c) => sum + c.countById, 0),
    [sideboardCards]
  );

  // Format validation — recomputes whenever deck contents or format settings change
  const validation = useMemo(() => {
    if (!selectedDeck || selectedDeck === 0 || selectedDeck === 'Default') {
      return { isValid: true, errors: [], cardIssues: new Map() };
    }
    return isCommanderDeck
      ? commanderRules(mainDeckCards, commanderName)
      : standardRules(mainDeckCards);
  }, [mainDeckCards, isCommanderDeck, commanderName, selectedDeck]);

  //function to UPDATE deck card_count and deck color

  const updateDeck = debounce(async () => {
    if (selectedDeck) {
      let selectedDeckObject = decks.find(
        (deck) => deck.id_deck.toString() === selectedDeck
      );

      const colorChanged = deckColorDefined !== selectedDeckObject?.color;
      const countChanged = DeckSize         !== selectedDeckObject?.card_count;

      if (colorChanged || countChanged) {
        try {
          await Axios.put(
            `${window.name}/decks/${selectedDeck}`,
            { color: deckColorDefined, card_count: DeckSize },
            config
          );
          console.log("Update Succeeded:", deckColorDefined, DeckSize);
        } catch (error) {
          console.error("Update Failed:", error);
        }
      }
    }
  }, 400);

  // Add a useEffect hook to trigger updateDeck when deckColorDefined or DeckSize change
  useEffect(() => {
    if (selectedDeck) {
      updateDeck(deckColorDefined, DeckSize);
    }
  }, [deckColorDefined, DeckSize]);

  const RenderedDeckSize = DeckSize > 0
    ? (isCommanderDeck ? `${DeckSize} / 100 Cards` : `${DeckSize} Cards`)
    : "";
  const isLessThanSixty = !validation.isValid && RenderedDeckSize !== ""
    ? styles.Red : styles.Normal;

  return (
    <div className={styles.Background}>
      <div
        onDrop={handleDrop}
        id="upper"
        droppable="true"
        onDragOver={handleDragOver}
      >
        <h1 className={styles.title}>
          {t('collection.title', {
            n: totalCards,
            worth: networth && parseFloat(networth) > 0
              ? t('collection.worth', { v: networth })
              : '',
          })}
        </h1>
        <SearchContainer
          baseOfSearch="collection"
          onParamsChange={handleSuperParams}
          isLoading={isLoading}
        />

        <div className={styles.cardsContainer}>
          <Scrollbars
            ref={scrollbarsRef}
            style={{ width: "90%", height: "100%" }}
            onScrollFrame={handleScrollFrame}
          >
            <div
              className={`d-flex flex-nowrap ${styles.cardsRow}`}
              onWheel={handleHorizontalScroll}
              scrollLeft={scrollLeft}
            >
              {cards.map((card, key) => (
                <Card
                  key={key}
                  id={card.id}
                  multiverseId={card.multiverseId}
                  scryfallId={card.scryfallId}
                  name={card.name}
                  types={card.types}
                  keywords={card.keywords}
                  count={card.countById}
                  table="collection"
                  id_collection={card.id_collection}
                  refresh={handleRefresherToggler}
                  getChosenDeck={selectedDeck}
                  getDeckCards={deckCards}
                  getCollectionCards={cards}
                  prices={card.prices}
                  isCommanderDeck={isCommanderDeck}
                  commanderColorIdentity={commanderColorIdentity}
                  onAddToDeck={(collId) => postOnDeck(collId)}
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
              defaultValue={"Default"}
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
              <span className={isLessThanSixty}>{RenderedDeckSize}</span>
              {!validation.isValid && validation.errors.length > 0 && RenderedDeckSize && (
                <div className={styles.validationHintBox}>
                  {validation.errors.map((err, i) => (
                    <p key={i} className={styles.validationHintItem}>{err}</p>
                  ))}
                </div>
              )}
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
                    onChange={handleCommanderToggle}
                  />
                  <span className={styles.commanderToggleSlider} />
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
                          onSetDeckQty={(newQty) => setDeckCardQty(deckCard.id, newQty, false)}
                          onMoveTo={(qty) => moveCard(deckCard.id, true, qty)}
                          isCommanderDeck={isCommanderDeck}
                          isTheCommander={deckCard.name === commanderName}
                          onSetCommander={() => setDeckCommander(deckCard)}
                          cardIssue={validation.cardIssues.get(deckCard.id)}
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
                  onSetDeckQty={(newQty) => setDeckCardQty(deckCard.id, newQty, false)}
                  onMoveTo={(qty) => moveCard(deckCard.id, true, qty)}
                  isCommanderDeck={isCommanderDeck}
                  isTheCommander={deckCard.name === commanderName}
                  onSetCommander={() => setDeckCommander(deckCard)}
                  cardIssue={validation.cardIssues.get(deckCard.id)}
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
                            onSetDeckQty={(newQty) => setDeckCardQty(deckCard.id, newQty, true)}
                            onMoveTo={(qty) => moveCard(deckCard.id, false, qty)}
                            isCommanderDeck={isCommanderDeck}
                            cardIssue={validation.cardIssues.get(deckCard.id)}
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
                      onSetDeckQty={(newQty) => setDeckCardQty(deckCard.id, newQty, true)}
                      onMoveTo={(qty) => moveCard(deckCard.id, false, qty)}
                      isCommanderDeck={isCommanderDeck}
                      cardIssue={validation.cardIssues.get(deckCard.id)}
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

export default Collection;
