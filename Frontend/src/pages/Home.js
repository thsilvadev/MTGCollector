//styles
import styles from "../styles/Home.module.css";

//Imports

//Components
import Card from "../components/Card";

import SearchContainer from "../components/SearchContainer";

import SideBar from "../components/SideBar";

//Tools
import Api from '../Api';

import React, { useState, useEffect } from "react";

import { useAuthHeader } from "react-auth-kit";

import { useI18n } from "../i18n/LanguageContext";

import { toast } from "react-toastify";

//imgs
import welcome3 from "../images/welcome3.png";
import openedchest from "../images/opened-chest.png";
import floatingCards from "../images/cards.png";

function Home() {
  const { t } = useI18n();
  //all cards
  const [cards, setCards] = useState([]);

  //get page number
  const [page, setPage] = useState(0);

  //loading indicator for search
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    // Optionally reset page to 0 if you want to start fetching from the first page again
    setPage(0);
    // Always reset cards when superParams changes
    setIsLoading(true);
    Api.get(`/cards/0?${superParams}`).then(
      (response) => {
        // Reset the cards with the new data
        setCards(response.data);
        setIsLoading(false);
      }
    ).catch(() => setIsLoading(false));
  }, [superParams]); // Depend only on superParams

  useEffect(() => {
    // Fetch more cards when page changes
    console.log("Page state before fetch:", page);
    if (page > 0){
      setIsLoading(true);
      Api.get(`/cards/${page}?${superParams}`).then(
        (response) => {
          console.log("Page state after fetch:", page);
          // Append the new data to the existing cards
          setCards((prevCards) => [...prevCards, ...response.data]);
          setIsLoading(false);
        }
      ).catch(() => setIsLoading(false));
    }
    
  }, [page]); // Depend only on page

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
  const toggleRefresh = debounce(() => {
    setLiftedRefreshCards((prevRefresh) => !prevRefresh);
  }, 450);

  //Delete from Collection

  //Headers configuration
  const authHeader = useAuthHeader();

  const config = {
    headers: {
      authorization: authHeader(),
    },
  };

  const deleteFromCollection = (cardIdCollection) => {
    Api.delete(`/card/${cardIdCollection}`, config).then(() => {
      console.log(`Card deleted from collection`);
      notify();
      toggleRefresh();
    });
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
    const breakpoint = 850; // Set desired breakpoint in pixels here
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
    ? t('home.guide.modal')
    : t('home.guide.noModal');

  // Function to handle scroll event

  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } =
        document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 5) {
        setPage((prevPage) => prevPage + 1);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  //Toastify
  const notify = () => toast(t('toast.cardDeleted'));

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
          <img src={welcome3} className={styles.title} alt="Logo" />
          <div className={styles.chestContainer}>
            <div className={styles.chestWrapper}>
              <a href="/collection">
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
              </a>
            </div>
          </div>
        </div>

        <p className={styles.Paragraph}>
          {" "}
          {t('home.intro')}{" "}
          <i>Magic: The Gathering</i> {t('home.intro2')}
        </p>
        <ul className={styles.list}>
          <li className={styles.listItem}>
            {t('home.li1')}
          </li>
          <li className={styles.listItem}>
            {t('home.li2')}
          </li>

          <li className={styles.listItem}>
            {t('home.li3')}
          </li>

          <li className={styles.listItem}>
            {t('home.li4')}
          </li>
        </ul>

        <h1 className={styles.h1}>
          {t('home.h1')}{" "}
          <span className={styles.MTG}>
            <i>Magic: The Gathering</i>
          </span>{" "}
          {t('home.h1b')}
        </h1>
        <SearchContainer
          baseOfSearch="AllCards"
          onParamsChange={handleSuperParams}
          isLoading={isLoading}
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
              layout={card.layout}
              table="allCards"
              refresh={handleLiftedRefreshCards}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export default Home;
