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
}) {

  Card.defaultProps = {
    scryfallId: '', // Set a default value here or any other appropriate default value.
  };

  //Scryfall ID management
  
  const fileFace = 'front';
const fileType = 'large';
const fileFormat = '.jpg';
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
    let userCondition = prompt("You're adding a card to your collection. What's it's condition?", 'Near Mint')
    
    if (userCondition !== null){
    if(userCondition === "") {
        alert(`no condition info was put along with your new card`)
        cardCondition = `undescribed`
    } else {
        cardCondition = userCondition
        alert(`Card at the ${cardCondition} was put into your collection!`)
        
    }

    Axios
    .post(`http://192.168.0.82:3344/collection/`, {
      card_id: id,
      card_condition: cardCondition,
      id_collection: null /* later implement that */
    }).then(
        console.log(`id postado: ${id}`)
    )
  }};

  return (
    <div className="col-12 col-sm-6 col-lg-3" >
      <img
        src={
          `https://cards.scryfall.io/${fileType}/${fileFace}/${dir1}/${dir2}/${fileName}${fileFormat}`
        }
        onClick={postOnCollection}
        alt="card"
        className={`${isBattle} ${isPlane}`}
        onLoad={changeCardClass}
      />
    </div>
  );
}

export default Card;
