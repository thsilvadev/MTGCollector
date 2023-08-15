//SHIT DO DO FIRST

//imports
import { React, useState } from "react";
import Axios from "axios";

//styles

import styles from "../styles/Card.module.css";

function Card({
  id,
  types,
  name,
  setCode,
  rarity,
  cost,
  condition,
  scryfallId,
  multiverseId,
  keywords,
  table,
  id_collection,
  refresh,
}) {
  //Scryfall ID management

  const fileFace = "front";
  const fileType = "large";
  const fileFormat = ".jpg";
  const fileName = scryfallId;
  const dir1 = fileName.charAt(0);
  const dir2 = fileName.charAt(1);

  //Conditional CSS classes for exotic type cards

  const [battle, setBattle] = useState(false);
  const [plane, setPlane] = useState(false);

  const isBattle = battle ? styles.Battle : styles.Card;
  const isPlane = plane ? styles.Plane : styles.Card;

  const changeCardClass = () => {
    if (types === "Battle" || keywords === "Fuse") {
      setBattle(true);
    } else {
      setBattle(false);
    }
    if (types === "Plane") {
      setPlane(true);
    } else {
      setPlane(false);
    } //Fuse cards act just like Battle cards so it's using the same class.
  };

  //Click Handler
  const clickHandler = () => {
    if (table === "allCards") {
      postOnCollection();
    } else if (table === "collection") {
      addToDeck(); //this is just for testing, adding cards to deck will be dragging to sidebar.
      //deleteFromCollection();

    }
  };

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
      refresh((prevLiftedRefreshCards) => !prevLiftedRefreshCards),
      450
    );
  };

  //Post

  //postOnCollection
  const postOnCollection = () => {
    //Use prompt() method for card condition. Just for instance.
    let cardCondition;
    let userCondition = prompt(
      `You're adding ${name} to your collection. What's it's condition?`,
      "Undescribed"
    );

    if (userCondition !== null) {
      if (userCondition === "") {
        alert(`no condition info was put along with your new card`);
        cardCondition = `Undescribed`;
      } else {
        cardCondition = userCondition;
        alert(`${cardCondition} ${name} card was put into your collection!`);
      }

      Axios.post(`http://192.168.0.82:3344/collection/`, {
        card_id: id,
        card_condition: cardCondition,
        id_collection: null /* later implement that */,
      })
        .then(toggleRefresh())
        .then(console.log(`id postado: ${id}`));
    }
  };

  //Delete
  //Delete from Collection
  const deleteFromCollection = () => {
    if (
      window.confirm(`You're deleting ${name} from your collection. Confirm?`)
    ) {
      Axios.delete(`http://192.168.0.82:3344/card/${id_collection}`)
        .then(console.log(`${name} deleted from collection`))
        .then(toggleRefresh());
    }
  };

  //How many in collection?

  //Quantity owned in collection and in wishlist
  const [collectionCard, setCollectionCard] = useState([]);
  const [isMouseOver, setIsMouseOver] = useState(false); // State to manage mouse hover

  //get
  const inCollection = () => {
    Axios.get(`http://192.168.0.82:3344/card/${id}`).then((response) => {
      setCollectionCard(response.data);
    });
  };

  const handleMouseEnter = () => {
    inCollection(); // Fetch data when mouse enters the card
    setIsMouseOver(true);
  };

  const handleMouseLeave = () => {
    setIsMouseOver(false);
  };

  //Deck Interaction

  const addToDeck = () => {
    let chosenDeck = prompt(
      `You're adding ${name} to a deck. What deck id?`,
      "1"
    );

    if (chosenDeck !== null) {
      Axios.post(`http://192.168.0.82:3344/eachDeck/`, {
        id_card: id_collection,
        deck: chosenDeck,
      })
        .then(toggleRefresh())
        .then(console.log(`id postado: ${id}`));
    }
  };

  const renderer = () => {

      if (!isMouseOver) {
        return null; // Return null if the mouse is not over the card
      }

      if (collectionCard.length === 0) {
        return <span>not obtained</span>;
      } else {
        return collectionCard.map((hoveredCard) => (
          <span key={hoveredCard.id}>
            on Collection: {hoveredCard.countById}
          </span>
        ));
      }
  };

  //Drag and Drop (e.dataTransfer JS method)

  const handleOnDrag = (e, cardId) => {
    console.log("dragStart");
    e.dataTransfer.clearData();
    e.dataTransfer.setData("card", cardId);
  };

  return (
    <div className="col-12 col-sm-6 col-lg-4 col-xl-3">
      <div className={styles.CardContainer}>
        <img
          src={`https://cards.scryfall.io/${fileType}/${fileFace}/${dir1}/${dir2}/${fileName}${fileFormat}`}
          onClick={clickHandler}
          alt="card"
          className={`${isBattle} ${isPlane}`}
          onLoad={changeCardClass}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          draggable={true}
          onDragStart={(e) => handleOnDrag(e, id)}
        />
        <div className={styles.CardOverlay}>
          <p>{renderer()}</p>
        </div>
      </div>
    </div>
  );
}

export default Card;
