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
  keywords
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

  //Post

  //postOnCollection
  const postOnCollection = () => {
    //Use prompt() method for card condition. Just for instance.
    let cardCondition;
    let userCondition = prompt(
      "You're adding a card to your collection. What's it's condition?",
      "Near Mint"
    );

    if (userCondition !== null) {
      if (userCondition === "") {
        alert(`no condition info was put along with your new card`);
        cardCondition = `undescribed`;
      } else {
        cardCondition = userCondition;
        alert(`Card at the ${cardCondition} was put into your collection!`);
      }

      Axios.post(`http://192.168.0.82:3344/collection/`, {
        card_id: id,
        card_condition: cardCondition,
        id_collection: null /* later implement that */,
      }).then(console.log(`id postado: ${id}`));
    }
  };

  //Delete
  /*
                                                
   __       _                                    _       _       
  / _|_   _| |_ _   _ _ __ ___   _   _ _ __   __| | __ _| |_ ___ 
 | |_| | | | __| | | | '__/ _ \ | | | | '_ \ / _` |/ _` | __/ _ \
 |  _| |_| | |_| |_| | | |  __/ | |_| | |_) | (_| | (_| | ||  __/
 |_|  \__,_|\__|\__,_|_|  \___|  \__,_| .__/ \__,_|\__,_|\__\___|
                                      |_|                        
                                      
                                      */

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

  const renderer = () => {
    if (!isMouseOver) {
      return null; // Return null if the mouse is not over the card
    }

    if (collectionCard.length === 0) {
      return <span>owned: 0</span>;
    } else {
      return collectionCard.map((hoveredCard) => (
        <span key={hoveredCard.id}>owned: {hoveredCard.countById}</span>
      ));
    }
  };





  return (
    <div className="col-12 col-sm-6 col-lg-3">
      <div className={styles.cardContainer}>
      <img
        src={`https://cards.scryfall.io/${fileType}/${fileFace}/${dir1}/${dir2}/${fileName}${fileFormat}`}
        onClick={postOnCollection}
        alt="card"
        className={`${isBattle} ${isPlane}`}
        onLoad={changeCardClass}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      <div className={styles.CardOverlay}>
        <p>{renderer()}</p>
      </div>
      </div>
      
    </div>
  );
}

export default Card;
