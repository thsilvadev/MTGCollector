//styles
import styles from "../styles/Home.module.css";

//Imports

//Components
import Card from "../components/Card";

import SearchContainer from "../components/SearchContainer";

import PrevNext from "../components/PrevNext";

import SideBar from "../components/SideBar";

//Tools
import Axios from "axios";

import React, { useState, useEffect } from "react";

//imgs
import welcome from "../images/welcome.png";
import closedchest from "../images/closed-chest.png";
import openedchest from "../images/opened-chest.png";
import floatingCards from "../images/cards.png";

function Home() {
  //all cards
  const [cards, setCards] = useState([]);

  //get page number
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

  //get filtered and paginated Cards in real time
  useEffect(() => {
    Axios.get(`http://192.168.0.82:3344/cards/${page}?${superParams}`).then(
      (response) => {
        setCards(response.data);
      }
    );
  }, [page, superParams]);

  //Image Switcher

  const [isHovered, setIsHovered] = useState(false);
  const [isImagesLoaded, setIsImagesLoaded] = useState(false);

  const HandleMouseEnter = () => {
    setIsHovered(true);
  };
  const HandleMouseLeave = () => {
    setIsHovered(false);
  };

  useEffect(() => {
    const preloadImages = async () => {
      try {
        await Promise.all([
          // Preload the images here
          new Promise((resolve) => {
            const img1 = new Image();
            img1.src = closedchest;
            img1.onload = resolve;
          }),
          new Promise((resolve) => {
            const img2 = new Image();
            img2.src = openedchest;
            img2.onload = resolve;
          }),
          new Promise((resolve) => {
            const img3 = new Image();
            img3.src = floatingCards;
            img3.onload = resolve;
          }),
        ]);
        setIsImagesLoaded(true);
      } catch (error) {
        // Handle any errors while preloading images
        console.error("Error preloading images:", error);
      }
    };

    preloadImages();
  }, []);

  //Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleModalOpen = (modalState) => {
      setIsModalOpen(modalState);

    }

    const containerClass = isModalOpen ? styles.cardsContainerWithModal : styles.cardsContainer;

  return (
    <>
      <SideBar modalHandler={handleModalOpen}/>
      <div className={styles.titleContainer}>
        <img src={welcome} className={styles.title} width="500" alt="Logo" />
        <div
          className={styles.chestContainer}
          onMouseEnter={HandleMouseEnter}
          onMouseLeave={HandleMouseLeave}
        >
          <a href="/collection">
            {isHovered && isImagesLoaded ? (
              <div>
                <img
                  src={openedchest}
                  className={styles.chest}
                  alt="opened chest"
                />{" "}
                <img
                  src={floatingCards}
                  className={styles.fCards}
                  alt="cards floating"
                />
              </div>
            ) : (
              <img src={closedchest} className={styles.chest} alt="chest" />
            )}
          </a>
        </div>
      </div>

      <p className={styles.Paragraph}>
        {" "}
        MTGCollector is the perfect solution for organizing your{" "}
        <i>Magic: The Gathering</i> cards! Here you'll be able to:
      </p>
      <ul className={styles.list}>
        <li className={styles.listItem}>
          Mirror your physical cards by adding cards to your collection.
        </li>
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

      <h1 className={styles.h1}>
        All <i>Magic: The Gathering</i> Cards
      </h1>
      <SearchContainer
        baseOfSearch="AllCards"
        onParamsChange={handleSuperParams}
      />
      <div className={containerClass}>
        <div className="row justify-content-center">
          {cards.map((card, key) => (
            <Card
              key={key}
              id={card.id}
              multiverseId={card.multiverseId}
              scryfallId={card.scryfallId}
              name={card.name}
              cost={card.manaCost}
              types={card.types}
              keywords={card.keywords}
              table="allCards"
            />
          ))}
        </div>
      </div>

      <PrevNext onPageChange={handlePage} page={page} cardTotal={cards} where='page'/>
    </>
  );
}

export default Home;
