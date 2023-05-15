//styles
import styles from "../styles/Home.module.css";

//Imports

import Card from "../components/Card";

import SearchContainer from "../components/SearchContainer";

import Axios from "axios";

import React, { useState, useEffect } from "react";

//Get Cards

function Home() {
  const [cards, setCards] = useState([]);

  const page = 1;

  useEffect(() => {
    Axios.get(`http://192.168.0.88:3344/cards/${page}`).then((response) => {
      setCards(response.data);
    });
  }, []);

  return (
    <>
      <h2 className={styles.title}> Welcome to MTGCollector!</h2>
      <h3> What is it for?</h3>
      <p className={styles.Paragraph}>
        {" "}
        MTGCollector is the perfect solution for organizing you're{" "}
        <i>Magic: The Gathering</i> cards! Here you'll be able to:
      </p>
      <ul className={styles.list}>
        <li>Mirror your physical cards by adding cards to your collection.</li>
        <li>
          Build multiple decks with the same cards that you have so you don't
          need to take notes on shared cards
        </li>

        <li>
          Fill your wishlist and write a description on each card to remember
          their role in your malevolent strategies in assigned deck
        </li>

        <li>
          ... and much more! All this with actual 3rd millenium user interface!
          We keep it clean, we keep it safe.
        </li>
      </ul>

      <button>Create Collection!</button>

      <h1>All Magic Cards</h1>
      <SearchContainer baseOfSearch="AllCards" />
      <h3>Cards</h3>
      <div className="row justify-content-around">
          {cards.map((card, key) => (
            <Card
              key={key}
              id={card.id}
              multiverseId={card.multiverseId}
              cardname={card.name}
            />
          ))}
        </div>
    </>
  );
}

export default Home;
