//Styles
import styles from "../styles/MiniCard.module.css";

//Tools
import Axios from "axios";
import { React, useState } from "react";

//imgs
import black from "../images/black.png";
import green from "../images/green.png";
import red from "../images/red.png";
import blue from "../images/blue.png";
import white from "../images/white.png";

const MiniCard = ({
  id,
  name,
  table,
  cost,
  id_collection,
  id_constructed,
  isModalOpen,
  count,
  toggle,
  scryfallId,
  types,
  keywords
}) => {
  //Delete
  //Delete from Collection
  const deleteFromCollection = () => {
    if (
      window.confirm(`You're deleting ${name} from your collection. Confirm?`)
    ) {
      Axios.delete(`${window.name}/card/${id_collection}`).then(
        console.log(`requested to delete ${name} from collection`)
      );
      toggle();
    }
  };

  //Delete from Deck
  const deleteFromDeck = () => {
    if (window.confirm(`You're deleting ${name} from your deck. Confirm?`)) {
      Axios.delete(`${window.name}/eachDeck/${id_constructed}`).then(
        console.log(`requested to delete ${name} from collection`)
      );
      toggle();
    }
  };

  //name sanitization (to deal with Transform cards that has two names)
  function removeAfterDoubleSlash(cardName) {
    const doubleSlashIndex = cardName.indexOf("//");

    if (doubleSlashIndex !== -1) {
      // If '//' is found, remove the portion of the string after it
      return cardName.slice(0, doubleSlashIndex).trim();
    } else {
      // If '//' is not found, return the original string
      return cardName;
    }
  }

  const cardName = removeAfterDoubleSlash(name);

  //Drag and Drop (e.dataTransfer JS method)

  const handleOnDrag = (e, cardId) => {
    console.log("dragStart");
    e.dataTransfer.clearData();
    e.dataTransfer.setData("cardDeletion", cardId);
  };

  //Mana Cost icons handler

  //This is where I learned that JSX Elements are not strings nor objects, they are React Elements. You can put them in an array and send the array to be rendered just fine.
  function costIconHandler(theCardCost) {
    if (theCardCost) {
      const sanitizedCost = theCardCost.replace(/\{|\}/g, "");
      const resultElements = [];

      for (let i = 0; i < sanitizedCost.length; i++) {
        if (sanitizedCost[i].charCodeAt(0) <= 57) {
          resultElements.push(
            <div key={i} className={styles.colorlessIcon}>
              {sanitizedCost[i]}
            </div>
          );
        } else if (sanitizedCost[i] === "B") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={black}
              width="11"
              alt="black-logo"
            />
          );
        } else if (sanitizedCost[i] === "G") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={green}
              width="11"
              alt="green-logo"
            />
          );
        } else if (sanitizedCost[i] === "R") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={red}
              width="11"
              alt="red-logo"
            />
          );
        } else if (sanitizedCost[i] === "U") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={blue}
              width="11"
              alt="blue-logo"
            />
          );
        } else if (sanitizedCost[i] === "W") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={white}
              width="11"
              alt="white-logo"
            />
          );
        }
      }

      return resultElements;
    } else {
      return "";
    }
  }

  const cardCost = costIconHandler(cost);

  //Handling Scaled Copy on hover offset

  const [scaledCardClass, setScaledCardClass] = useState("");

  const HandleOffset = (e) => {
    const card = e.currentTarget; // Get the hovered card element

    // Get the position of the hovered card relative to the viewport
    const cardRect = card.getBoundingClientRect();

    // Calculate the X position of the card
    const cardX = cardRect.left;

    // Get the width of the viewport
    const viewportWidth = window.innerWidth;

    // Check if the hovered card is on the left side of the screen
    const isOnLeftSide = cardX < viewportWidth / 2;

    // Check if the hovered card is on the right side of the screen

    // Now you can use isOnLeftSide and isOnRightSide to determine the position
    // and apply different styles or logic based on its position.

    if (isOnLeftSide) {
      if (battle || plane) {
        setScaledCardClass(styles.LeftPlaneOrBattle);
      } else {
        setScaledCardClass(styles.Left);
      }
    } else {
      if (battle || plane) {
        setScaledCardClass(styles.RightPlaneOrBattle);
      } else {
        setScaledCardClass(styles.Right);
      }
    }

    console.log(scaledCardClass);
  };

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

  const isBattleOrPlane = battle || plane ? styles.scaledPlaneOrBattle : styles.scaledCard;

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
    }
  }

  const [isMouseOver, setIsMouseOver] = useState(false); // State to manage mouse hover

  const handleMouseEnter = () => {
    setIsMouseOver(true);
  };

  const handleMouseLeave = () => {
    setIsMouseOver(false);
  };

  //Render

  if (isModalOpen) {
    if (table === "collection") {
      return (
        <div
          className={styles.MiniCard}
          onLoad={changeCardClass}
          onClick={deleteFromCollection}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          draggable={true}
          onDragStart={(e) => handleOnDrag(e, id_collection)}
          onMouseMove={HandleOffset}
          onTouchStart={handleMouseEnter}
          onTouchEnd={handleMouseLeave}
        >
          <div className={styles.Count}>
            <p>{count}x</p>
          </div>
          <div className={styles.Main}>
            <span>{cardName}</span>
            <span className={styles.cardCost}>{cardCost}</span>
          </div>
          <div
            className={scaledCardClass}
            style={{
              display: isMouseOver ? "block" : "none",
            }}
          >
            <img
              className={`${isBattleOrPlane}`}
              src={`https://cards.scryfall.io/${fileType}/${fileFace}/${dir1}/${dir2}/${fileName}${fileFormat}`}
              alt="card"
            />
          </div>
        </div>
      );
    } else if (table === "deck") {
      return (
        <div
          className={styles.MinierCard}
          onLoad={changeCardClass}
          onClick={deleteFromDeck}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          draggable={true}
          onDragStart={(e) => handleOnDrag(e, id_constructed)}
          onMouseMove={HandleOffset}
          onTouchStart={handleMouseEnter}
          onTouchEnd={handleMouseLeave}
        >
          <div className={styles.Count}>
            <p>{count}x</p>
          </div>

          <div className={styles.Main}>
            <span>{cardName}</span>
            <span className={styles.cardCost}>{cardCost}</span>
          </div>

          <div
            className={scaledCardClass}
            style={{
              display: isMouseOver ? "block" : "none",
            }}
          >
            <img
              className={`${isBattleOrPlane}`}
              src={`https://cards.scryfall.io/${fileType}/${fileFace}/${dir1}/${dir2}/${fileName}${fileFormat}`}
              alt="card"
            />
          </div>
        </div>
      );
    }
  }
};

export default MiniCard;
