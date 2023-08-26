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

  //some refreshToggler
  const [refresherToggler, setRefresherToggler] = useState(false);
  const handleRefresherToggler = (wasToggled) => {
    setRefresherToggler(wasToggled);
  };

  //get filtered and paginated Collection Cards in real time
  useEffect(() => {
    Axios.get(`${window.name}/collection/${page}?${superParams}`)
      .then((response) => {
        setCards(response.data);
      })
      .then(console.log(refresherToggler));
  }, [page, superParams, refresherToggler]);

  // Scroll position state
  const [scrollLeft, setScrollLeft] = useState(0);

  // Handle horizontal scroll using the mouse wheel event
  const handleHorizontalScroll = (e) => {
    setScrollLeft(scrollLeft + e.deltaY);
  };

  ///////decksContainer////////
  //selectDeck

  const [selectedDeck, setSelectedDeck] = useState(0);

  const handleDeckChange = (event) => {
    setSelectedDeck(event.target.value);
    console.log(`selected deck: ${selectedDeck}`)
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

  const [deckCards, setDeckCards] = useState([])

useEffect(() => {
  Axios.get(`${window.name}/eachDeck/${selectedDeck}`).then(
    (response) => {
      setDeckCards(response.data);
    }
  ).then(console.log(`selected deck: ${selectedDeck}`));
}, [selectedDeck]);

const deckCardCount = deckCards.length;


  return (
    <div>
      <SearchContainer
        baseOfSearch="collection"
        onParamsChange={handleSuperParams}
      />

      <div className={styles.cardsContainer}>
        <Scrollbars style={{ width: "90%", height: "100%" }}>
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
      <div className={styles.deckContainer}>
        <div className={styles.selectDeck}>
          <select
            value={selectedDeck}
            className={styles.selectInput}
            onChange={handleDeckChange}
            aria-label="Default select example"
          >
            <option selected> </option>
            {decks.map((deck, key) => (
              <option value={deck.id_deck}>{deck.name}</option>
            ))}
          </select>
          <span>{deckCardCount}</span>
        </div>
        <div className={styles.minicardsContainer}>
            <div className={styles.minicardsCol}>
            {deckCards
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
                />
              ))
              .sort((a, b) => b - a)}
            </div>
            <div className={styles.minicardsCol}></div>
            <div className={styles.minicardsCol}></div>
            <div className={styles.minicardsCol}></div>
            <div className={styles.minicardsCol}></div>
            <div className={styles.minicardsCol}></div>
            <div className={styles.minicardsCol}></div>
        </div>
      </div>
    </div>
  );
}

export default Collection;
