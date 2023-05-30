//styles
import styles from "../styles/Home.module.css";

//Imports

import Card from "../components/Card";

import SearchContainer from "../components/SearchContainer";

import PrevNext from "../components/PrevNext";

import Axios from "axios";

import React, { useState, useEffect } from "react";



function Home() {
  const [cards, setCards] = useState([]);

  //get page number
  const [page, setPage] = useState(0);
  const handlePage = (pageData) => {
    setPage(pageData)
    console.log(page)
  }

  //get Params
  const [superParams, setSuperParams] = useState('')
  const handleSuperParams = (paramsData) => {
    setSuperParams(paramsData)
    console.log(superParams)
  }

  //get filtered and paginated Cards
  useEffect(() => {
    Axios.get(`http://192.168.0.82:3344/cards/${page}?${superParams}`).then((response) => {
      setCards(response.data);
    });
  }, [page, superParams]);

  //Loading Spinner
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState(0);
  const totalImages = cards.length;

  const handleImageLoad = () => {
    setLoadedImages(prevCount => prevCount + 1)
  }

  useEffect(() => {
    if (loadedImages === totalImages) {
      setLoading(false);
    }
  }, [loadedImages, totalImages])
  //End of Loading Spinner

  return (
    <>
      <div className={styles.titleContainer}>
      <h2 className={styles.title}> Welcome to MTGCollector!</h2>
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

      <h1>All <i>Magic: The Gathering</i> Cards</h1>
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
