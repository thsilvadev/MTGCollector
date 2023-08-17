//Styles
import styles from "../styles/SideBox.module.css";

//Tools
import React, { useState, useEffect } from "react";
import Axios from "axios";
import { Scrollbars } from "react-custom-scrollbars-2";

//Components
import MiniCard from "./MiniCard";
import PrevNext from "./PrevNext";

const SideBox = ({ modalToggler, refresher }) => {
  //change css class when card is being dragged over the sidebar
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  const handleDragEnter = () => {
    setIsDraggedOver(true);
    console.log("drag entered")
  };

  const handleDragLeave = () => {
    setIsDraggedOver(false);
    console.log("drag leaved")

  };

  //make it a dropzone using `e.dataTransfer.getData`

  //postOnCollection
  const postOnCollection = (cardId) => {
    //Use prompt() method for card condition. Just for instance.
    let cardCondition;
    let userCondition = prompt(
      `What is the card condition?`,
      "Undescribed"
    );

    if (userCondition !== null) {
      if (userCondition === "") {
        alert(`no condition info was put along with your new card`);
        cardCondition = `Undescribed`;
      } else {
        cardCondition = userCondition;
        alert(` ${cardCondition} card was put into your collection!`);
      }

      Axios.post(`http://192.168.0.82:3344/collection/`, {
        card_id: cardId,
        card_condition: cardCondition,
        id_collection: null /* later implement that. This is for multiple users (multiple collection) */,
      }).then(
          console.log(`Card posted of id: ${cardId}`)
        ).then(
          toggleRefresh()
        );
    }
  };

  const handleDrop = (e) => {
    //on drop, get card ID
    setIsDraggedOver(false);
    const pickedCard = e.dataTransfer.getData("card");
    if (pickedCard){
      postOnCollection(pickedCard);
      console.log("card Id:", pickedCard);
    } else if (!pickedCard){
      console.log('no data was caught')
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggedOver(true);
    console.log("drag over");
  };

  

  //Get cards from collection

  //cards
  const [cards, setCards] = useState([]);

  //page value
  const [page, setPage] = useState(0);

  const handlePage = (pageData) => {
    setPage(pageData);
  };

  //get filtered and paginated Collection Cards in real time

  // Add a state variable to trigger card refresh
  const [refreshCards, setRefreshCards] = useState(false);

      //Debouncer
      const debounce = (func, delay) => {
        let timerId;
    
        return (...args) => {
          clearTimeout(timerId);
    
          timerId = setTimeout(() => {
            func.apply(this, args);
          }, delay);
        };
      };

  // Function to toggle the refreshCards state
  const toggleRefresh = () => {
    debounce(
    setRefreshCards((prevRefresh) => !prevRefresh), 650
    )
  };

  

  useEffect(() => {
    //This is for adding cards
    console.log("logging liftedRefreshCards changing:", refresher)
    //This is for deleting cards
    console.log("logging refreshCards changing:", refreshCards);
    //GET 'EM!
    Axios.get(`http://192.168.0.82:3344/collection/${page}`).then(
      (response) => {
        setCards(response.data);
      }
    );
  }, [page, refreshCards, refresher]);

  //css classes

  const boxClass = modalToggler ? styles.OpenBoxDiv : styles.ClosedBoxDiv;
  const uponDraggingItem = isDraggedOver
    ? styles.UponDraggedItem
    : styles.OpenBoxDiv;

  return (
    <div>
      <div
        className={`${boxClass} ${uponDraggingItem}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <h6>
          <a className={styles.Link} href="/collection">
            Collection
          </a>
        </h6>
        <PrevNext
          onPageChange={handlePage}
          page={page}
          cardTotal={cards}
          where="sidebar"
        />
        <Scrollbars style={{ width: "100%", height: "90%" }}>
          <div>
            {cards
              .map((card, key) => (
                <MiniCard
                  key={key}
                  id={card.id}
                  cost={card.manaCost}
                  name={card.name}
                  table="collection"
                  id_collection={card.id_collection}
                  isModalOpen={modalToggler}
                  count={card.countById}
                  toggle={toggleRefresh}
                />
              ))
              .sort((a, b) => b - a)}
          </div>
        </Scrollbars>
      </div>
    </div>
  );
};

export default SideBox;
