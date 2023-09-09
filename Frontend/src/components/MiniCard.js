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
  keywords,
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

  // Mousemove event handler

  const [scaledCardPosition, setScaledCardPosition] = useState({
    x: -9999,
    y: -9999,
  });

  const handleMouseMove = (e) => {
    // Calculate the X and Y positions for the scaled card
    const card = e.currentTarget; // Get the hovered card element

    // Get the position of the hovered card relative to the viewport
    const cardRect = card.getBoundingClientRect();

    const cardWidth = cardRect.width;

    // Calculate the X position of the card
    const cardX = cardRect.left;
    // Calculate the amount by which the scaled copy should be shifted to the center
    const shift = cardWidth / 2;

    // Get the width of the viewport
    const viewportWidth = window.innerWidth;
    // Calculate the X position where the scaled copy should be centered
    const centerX = viewportWidth / 2;

    // Check if the hovered card is on the left side of the screen
    const isOnLeftSide = cardX < centerX - shift;

    const x = e.clientX - cardRect.left - card.offsetWidth / 2 + 150;
    const y = e.clientY - cardRect.top - card.offsetHeight / 2;
    const xRight = e.clientX - cardRect.left - card.offsetWidth / 2 - 150;
    const z = e.clientY - cardRect.top - card.offsetHeight / 2 + 70;
    const w = e.clientX - cardRect.left - card.offsetWidth / 2 - 12;

    // Update the scaled card's position

    if (table === "deck") {
      if (viewportWidth < 576) {
        setScaledCardPosition({ x: w, y: z });
      } else {
        if (isOnLeftSide) {
          setScaledCardPosition({ x, y });
        } else {
          setScaledCardPosition({ x: xRight, y });
        }
      }
    } else {
      setScaledCardPosition({ x: w, y: z });
    }
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

  const isBattleOrPlane =
    battle || plane ? styles.scaledPlaneOrBattle : styles.scaledCard;

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
  };

  const [isMouseOver, setIsMouseOver] = useState(false); // State to manage mouse hover
  const [istouchOver, setIsTouchOver] = useState(false); // State to manage touch hover

  const handleMouseEnter = (e) => {
    handleMouseMove(e);
    setIsMouseOver(true);
  };

  const handleMouseLeave = () => {
    setIsMouseOver(false);
  };

  const handleTouchEnter = (e) => {
    handleMouseMove(e);
    setIsTouchOver(true);
  };

  const handleTouchLeave = () => {
    setIsTouchOver(false);
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
          onMouseMove={handleMouseMove}
          draggable={true}
          onDragStart={(e) => handleOnDrag(e, id_collection)}
          onTouchStart={handleTouchEnter}
          onTouchEnd={handleTouchLeave}
          onTouchMove={handleMouseMove}
        >
          <div className={styles.Count}>
            <p>{count}x</p>
          </div>
          <div className={styles.Main}>
            <span>{cardName}</span>
            <span className={styles.cardCost}>{cardCost}</span>
          </div>
          <div
            className={styles.Card}
            style={{
              position: "fixed",
              left: `${scaledCardPosition.x}px`,
              top: `${scaledCardPosition.y}px`,
              display: isMouseOver || istouchOver ? "block" : "none",
            }}
          >
            <img
              style={{
                height: "300px",
              }}
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
          onMouseMove={handleMouseMove}
          draggable={true}
          onDragStart={(e) => handleOnDrag(e, id_constructed)}
          onTouchStart={handleTouchEnter}
          onTouchEnd={handleTouchLeave}
          onTouchMove={handleMouseMove}
        >
          <div className={styles.Count}>
            <p>{count}x</p>
          </div>

          <div className={styles.Main}>
            <span>{cardName}</span>
            <span className={styles.cardCost}>{cardCost}</span>
          </div>

          <div
            className={styles.Card}
            style={{
              position: "absolute",
              left: `${scaledCardPosition.x}px`,
              top: `${scaledCardPosition.y}px`,
              display: isMouseOver || istouchOver ? "block" : "none",
            }}
          >
            <img
              style={{
                height: "300px",
              }}
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
