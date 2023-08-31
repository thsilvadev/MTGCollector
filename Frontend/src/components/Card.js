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
  const [collected, setCollected] = useState(false);

  const isBattle = battle ? styles.Battle : styles.Card;
  const isPlane = plane ? styles.Plane : styles.Card;
  const isCollected = collected ? styles.Collected : '';

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
    if (table === "collection"){
      setCollected(true)
    } else {
      setCollected(false);
    }
  };

  //Click Handler
  const clickHandler = () => {
    if (table === "allCards") {
      postOnCollection();
    } else if (table === "collection") {
      deleteFromCollection();
    }
  };

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
    refresh();
  }, 450);

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

      Axios.post(`${window.name}/collection/`, {
        card_id: id,
        card_condition: cardCondition,
        id_collection: null /* later implement that */,
      })
      .then(() => {
        console.log(`Card posted of id: ${id}`);
        toggleRefresh();
      });
    }
  };

  //Delete
  //Delete from Collection
  const deleteFromCollection = () => {
    if (
      window.confirm(`You're deleting ${name} from your collection. Confirm?`)
    ) {
      Axios.delete(`${window.name}/card/${id_collection}`)
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
    Axios.get(`${window.name}/card/${id}`).then((response) => {
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

  const renderer = () => {
    if (!isMouseOver) {
      return null; // Return null if the mouse is not over the card
    }

    if (collectionCard.length === 0) {
      return <span>not obtained</span>;
    } else {
      return collectionCard.map((hoveredCard) => (
        <span key={hoveredCard.id}>on Collection: {hoveredCard.countById}</span>
      ));
    }
  };

  //Drag and Drop (e.dataTransfer JS method)

  const handleOnDrag = (e, cardId) => {
    console.log("dragStart");
    e.dataTransfer.clearData();
    e.dataTransfer.setData("card", cardId);
  };

  //Handle table variation for dragStart event
  const handleTableDrag = () => {
    if (table === 'allCards'){
      return (e) => handleOnDrag(e, id)
    } else if (table === 'collection') {
      return (e) => handleOnDrag(e, id_collection)
    }
  }


  //Conditional CSS classes in spite of table for card container

  const isAllCards = table === "allCards" ? styles.CardContainer : styles.CollectionCardContainer;

  //conditional bootstrap class for the whole component
  const componentContainer = table === "allCards" ? "col-12 col-sm-6 col-lg-4 col-xl-3" : "col";

  return (
    <div className={componentContainer}>
      <div className={isAllCards}>
        <img
          src={`https://cards.scryfall.io/${fileType}/${fileFace}/${dir1}/${dir2}/${fileName}${fileFormat}`}
          onClick={clickHandler}
          alt="card"
          className={`${isBattle} ${isPlane} ${isCollected}`}
          onLoad={changeCardClass}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          draggable={true}
          onDragStart={(e) => handleTableDrag()(e)}
        />
        <div className={styles.CardOverlay}>
          <p>{renderer()}</p>
        </div>
      </div>
    </div>
  );
}

export default Card;
