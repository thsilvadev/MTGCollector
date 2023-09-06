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

  //get Refresh from Card
  //Whenever a card is posted on collection, through Home.js, Card prop `refresh` calls it's function to toggle this state variable `liftedRefreshCards`. That variable is passed on to SideBar and then to SideBox, to trigger re-fetching. RESUME: THIS MAKES NEW CARDS IN COLLECTION IMMEDIATELY SHOW ON SIDEBAR COLLECTION.
  const [liftedRefreshCards, setLiftedRefreshCards] = useState(false);
  const handleLiftedRefreshCards = () => {
    toggleRefresh();
    console.log("changed liftedRefreshCards:", liftedRefreshCards);
  };

  //get filtered and paginated Cards in real time
  useEffect(() => {
    Axios.get(`${window.name}/cards/${page}?${superParams}`).then(
      (response) => {
        setCards(response.data);
      }
    );
  }, [page, superParams]);

  //Image Switcher
  const [isImagesLoaded, setIsImagesLoaded] = useState(false);

  /*
  const [isHovered, setIsHovered] = useState(false);
  

  const HandleMouseEnter = () => {
    if(isVeryWideScreen){
      setIsHovered(true);
    }
    
  };
  const HandleMouseLeave = () => {
    setIsHovered(false);
  };
  */

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

  //Function passed through props
  const handleModalOpen = (modalState) => {
    setIsModalOpen(modalState);
  };

  const upperContainerClass = isModalOpen
    ? styles.upperContainerWithModal
    : styles.upperContainer;

  const cardsContainerClass = isModalOpen
    ? styles.cardsContainerWithModal
    : styles.cardsContainer;

  //Delete by dragging minicards off the sidebox

  //Debounced toggle refresher
  //Debouncer
  const debounce = (func, delay) => {
    let timerId;

    return (...args) => {
      clearTimeout(timerId);

      timerId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // Function to toggle the refreshCards state
  const toggleRefresh = () => {
    debounce(
      setLiftedRefreshCards((prevRefresh) => !prevRefresh),
      450
    );
  };

  //Delete from Collection
  const deleteFromCollection = (cardIdCollection) => {
    if (window.confirm(`Confirm deletion?`)) {
      Axios.delete(`${window.name}/card/${cardIdCollection}`)
        .then(console.log(`Card deleted from collection`))
        .then(toggleRefresh());
    } else {
      window.alert("deletion canceled");
    }
  };

  const handleDrop = (e) => {
    //on drop, get card ID
    const cardToDelete = e.dataTransfer.getData("cardDeletion");
    if (cardToDelete) {
      deleteFromCollection(cardToDelete);
      console.log("card Id:", cardToDelete);
    } else if (!cardToDelete) {
      console.log("no data was caught");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    console.log("drag over");
  };

  //Tips change when modal is unavailable
  //modal won't work below certain resolution

  const [isWideScreen, setIsWideScreen] = useState(true);
  
  //const [isVeryWideScreen, setIsVeryWideScreen] = useState(true);

  const updateScreenSize = () => {
    const screenWidth = window.innerWidth;
    const breakpoint = 850; // Set your desired breakpoint in pixels here
    setIsWideScreen(screenWidth >= breakpoint);
    /*
    const veryBreakpoint = 1101;
    setIsVeryWideScreen(screenWidth > veryBreakpoint)
    */
  };

  // Add a resize event listener to update the state on window resize
  useEffect(() => {
    updateScreenSize(); // Initial update
    window.addEventListener("resize", updateScreenSize);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("resize", updateScreenSize);
    };
  }, []);

  const guideChangesWithModal = isWideScreen
    ? `Click on cards to add to your collection, or drag 'em to the side bar
    on the right side.`
    : `Click on cards to add to your collection.`;

  return (
    <>
      <SideBar modalHandler={handleModalOpen} refresh={liftedRefreshCards} />
      <div
        className={upperContainerClass}
        droppable="true"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className={styles.titleContainer}>
          <img src={welcome} className={styles.title} alt="Logo" />
          <div className={styles.chestContainer}>
            <div
              className={styles.chestWrapper}
            >
              <a href="/collection">
                {isImagesLoaded ? (
                  <div className={styles.chestContent}>
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
        </div>

        <p className={styles.Paragraph}>
          {" "}
          MTG Chest is the perfect solution for organizing your{" "}
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
            ... and much more! All this with actual 3rd millenium user
            interface! We keep it clean, we keep it safe.
          </li>
        </ul>

        <h1 className={styles.h1}>
          All <i>Magic: The Gathering</i> Cards
        </h1>
        <SearchContainer
          baseOfSearch="AllCards"
          onParamsChange={handleSuperParams}
        />
        <h5 className="mb-5">{guideChangesWithModal}</h5>
      </div>
      <div
        className={cardsContainerClass}
        droppable="true"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
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
              refresh={handleLiftedRefreshCards}
            />
          ))}
        </div>
      </div>

      <PrevNext
        onPageChange={handlePage}
        page={page}
        elementsArray={cards}
        where="page"
      />
    </>
  );
}

export default Home;
