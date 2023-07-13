//styles
import styles from "../styles/Home.module.css";

//Imports

import Card from "../components/Card";

import SearchContainer from "../components/SearchContainer";

import PrevNext from "../components/PrevNext";

import Axios from "axios";

import React, { useState, useEffect } from "react";

//imgs
import welcome from "../images/welcome.png";

function Home() {
  const [cards, setCards] = useState([]);

  //get page number
  const [page, setPage] = useState(0);
  const handlePage = (pageData) => {
    setPage(pageData)
  }

  //get Params
  const [superParams, setSuperParams] = useState('')
  const handleSuperParams = (paramsData) => {
    setSuperParams(paramsData)
    console.log(superParams)
  }

  //get filtered and paginated Cards in real time
  useEffect(() => {
    
    Axios.get(`http://192.168.0.82:3344/cards/${page}?${superParams}`).then((response) => {
      setCards(response.data);
    });
  }, [page, superParams]);

 

  return (
    <>
      <div className={styles.titleContainer}>
      <img src={welcome} className={styles.title} width="500"/>
      </div>
      
      <p className={styles.Paragraph}>
        {" "}
        MTGCollector is the perfect solution for organizing your{" "}
        <i>Magic: The Gathering</i> cards! Here you'll be able to:
      </p>
      <ul className={styles.list}>
        <li className={styles.listItem}>Mirror your physical cards by adding cards to your collection.</li>
        <li className={styles.listItem}>
          Build multiple decks with the same cards that you have so you don't
          need to take notes on shared cards
        </li>

        <li className={styles.listItem}>
          Fill your wishlist and write a description on each card to remember
          their role in your malevolent strategies in assigned deck
        </li>

        <li className={styles.listItem}>
          ... and much more! All this with actual 3rd millenium user interface!
          We keep it clean, we keep it safe.
        </li>
      </ul>

      <h1 className={styles.h1}>All <i>Magic: The Gathering</i> Cards</h1>
      <SearchContainer baseOfSearch="AllCards" onParamsChange={handleSuperParams} />
      <div className="row justify-content-around">
          {cards.map((card, key) => (
            <Card
              key={key}
              id={card.id}
              multiverseId={card.multiverseId}
              name={card.name}
              types={card.types}
              keywords={card.keywords}
            />
          ))}
        </div>
      <PrevNext onPageChange={handlePage} page={page}/>
    </>
  );
}

export default Home;
