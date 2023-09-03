//styles
import styles from "../styles/Collection.module.css";

//Imports

import Card from "../components/Card";

import SearchContainer from "../components/SearchContainer";

import PrevNext from "../components/PrevNext";

import Axios from "axios";

import React, { useState, useEffect } from "react";

import { Scrollbars } from "react-custom-scrollbars-2";

import MiniCard from "../components/MiniCard";

//Component

function Collection() {
  //cards
  const [cards, setCards] = useState([]);

  //page value
  const [page, setPage] = useState(0);

  const handlePage = (pageData) => {
    setPage(pageData);
  };

  //get Params
  const [superParams, setSuperParams] = useState("");
  const handleSuperParams = (paramsData) => {
    setSuperParams(paramsData);
    console.log(superParams);
  };

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
  }, 450);

  //get filtered and paginated Collection Cards in real time
  useEffect(() => {
    Axios.get(`${window.name}/collection/${page}?${superParams}`)
      .then((response) => {
        setCards(response.data);
      })
      .then(console.log(refresherToggler));
  }, [page, superParams, refresherToggler]);

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
  const uponDraggingItem = isDraggedOver
    ? styles.UponDraggedItem
    : styles.deckContainer;

  const handleDragEnter = () => {
    setIsDraggedOver(true);
    console.log("drag entered");
  };

  const handleDragLeave = () => {
    setIsDraggedOver(false);
    console.log("drag leaved");
  };

  const handleDrop = (e) => {
    //on drop, get card ID
    setIsDraggedOver(false);
    const pickedCard = e.dataTransfer.getData("card");
    if (pickedCard) {
      postOnDeck(pickedCard);
      console.log("card Id:", pickedCard);
    } else if (!pickedCard) {
      console.log("no data was caught");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggedOver(true);
    console.log("drag over");
  };

  //make it a dropzone using `e.dataTransfer.getData`

  //postOnDeck
  const postOnDeck = (collectionId) => {
    let chosenDeck = selectedDeck;

    if (chosenDeck !== null) {
      Axios.post(`${window.name}/eachDeck/`, {
        id_card: collectionId,
        deck: chosenDeck,
      })
        .then(console.log(`id postado: ${collectionId}`))
        .then(handleRefresherToggler());
    }
  };

  //selectDeck

  const [selectedDeck, setSelectedDeck] = useState(0);

  const handleDeckChange = (event) => {
    setSelectedDeck(event.target.value);
    console.log(`selected deck: ${selectedDeck}`);
  };

  //Decks
  const [decks, setDecks] = useState([]);

  useEffect(() => {
    Axios.get(`${window.name}/decks/0`)
      .then((response) => {
        setDecks(response.data);
      })
      .then(console.log("got decks"));
  }, []);

  //eachDeck

  const [deckCards, setDeckCards] = useState([]);

  useEffect(() => {
    if (selectedDeck) {
      Axios.get(`${window.name}/eachDeck/${selectedDeck}`)
        .then((response) => {
          setDeckCards(response.data);
        })
        .then(console.log(`selected deck: ${selectedDeck}`))
        .then(console.log(`refresherToggler: ${refresherToggler}`));
    }
  }, [selectedDeck, refresherToggler]);

  //How many cards there are in selected deck?
  const handleCardCount = () => {
    if (selectedDeck) {
      let deckCardsCount = 0;
      deckCards.forEach((deckCard) => {
        deckCardsCount += 1 * deckCard.countById;
      });
      return deckCardsCount;
    } else {
      return "";
    }
  };

  //Dividing this deck in 7 columns

  // Initialize arrays for different categories
  const manaValueArrays = Array.from({ length: 7 }, () => []);
  const landCards = [];

  // Categorize cards into different arrays
  deckCards.forEach((card) => {
    if (card.manaValue <= 1) {
      if (card.types.indexOf("Land") === -1) {
        manaValueArrays[0].push(card);
      }
    } else if (card.manaValue <= 5) {
      manaValueArrays[card.manaValue - 1].push(card);
    } else {
      manaValueArrays[5].push(card);
    }

    if (card.types.includes("Land")) {
      landCards.push(card);
    }
  });

  return (
    <div className={styles.Background}>
      <SearchContainer
        baseOfSearch="collection"
        onParamsChange={handleSuperParams}
      />

      <div className={styles.cardsContainer}>
        <Scrollbars style={{ width: "90%", height: "96%" }}>
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
                table="collection"
                id_collection={card.id_collection}
                refresh={handleRefresherToggler}
              />
            ))}
          </div>
        </Scrollbars>
        <PrevNext
          onPageChange={handlePage}
          page={page}
          elementsArray={cards}
          where="collection"
        />
      </div>
      <div
        className={uponDraggingItem}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className={styles.selectDeck}>
          <div className={styles.even}>
          <span>color</span>
          </div>
          
          <div>
          <select
            defaultValue={'Default'}
            value={selectedDeck}
            className={styles.selectInput}
            onChange={handleDeckChange}
            aria-label="Default select example"
          >
            <option value='Default'>Select Deck</option>
            {decks.map((deck, key) => (
              <option key={key} value={deck.id_deck}>
                {deck.name}
              </option>
            ))}
          </select>
          </div>
          <div className={styles.even}>
          <span>{handleCardCount()}</span>
          </div>
          
          
        </div>
        <div className={styles.minicardsContainer}>
        {manaValueArrays.map((manaArray, index) => (
    // Check if the manaArray is not empty
    manaArray.length > 0 && (
      <div className={styles.minicardsCol} key={index}>
        {manaArray
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
              toggle={handleRefresherToggler}
            />
          ))
          .sort((a, b) => b - a)}
      </div>
    )
  ))}
          <div className={styles.minicardsCol}>
            {landCards
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
                  toggle={handleRefresherToggler}
                />
              ))
              .sort((a, b) => b - a)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Collection;
