//Styles
import styles from "../styles/MiniCard.module.css";

//Tools
import Axios from "axios";
import { React, useState } from "react";

import { useAuthHeader } from "react-auth-kit";

//imgs
import black from "../images/black.png";
import green from "../images/green.png";
import red from "../images/red.png";
import blue from "../images/blue.png";
import white from "../images/white.png";
import colorless from "../images/Colorless.png";

import phyrexian from "../images/Phyrexian.png";

import phyrexianBlack from "../images/phyrexianBlack.png";
import phyrexianBlue from "../images/phyrexianBlue.png";
import phyrexianGreen from "../images/phyrexianGreen.png";
import phyrexianRed from "../images/phyrexianRed.png";
import phyrexianWhite from "../images/phyrexianWhite.png";

import twoBlack from "../images/2Black.png";
import twoBlue from "../images/2Blue.png";
import twoGreen from "../images/2Green.png";
import twoRed from "../images/2Red.png";
import twoWhite from "../images/2White.png";

import blackGreen from "../images/BlackGreen.png";
import blackRed from "../images/BlackRed.png";
import blueBlack from "../images/BlueBlack.png";
import blueRed from "../images/BlueRed.png";
import greenBlue from "../images/GreenBlue.png";
import greenWhite from "../images/GreenWhite.png";
import redGreen from "../images/RedGreen.png";
import redWhite from "../images/RedWhite.png";
import whiteBlack from "../images/WhiteBlack.png";
import whiteBlue from "../images/WhiteBlue.png";

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

  //Headers configuration
  const authHeader = useAuthHeader();

  const config = {
    headers: {
      authorization: authHeader(),
    },
  };

  //Delete from Collection
  const deleteFromCollection = () => {
    if (
      window.confirm(`You're deleting ${name} from your collection. Confirm?`)
    ) {
      Axios.delete(`${window.name}/card/${id_collection}`, config).then(
        console.log(`requested to delete ${name} from collection`)
      );
      toggle();
    }
  };

  //Delete from Deck
  const deleteFromDeck = () => {
    if (window.confirm(`You're deleting ${name} from your deck. Confirm?`)) {
      Axios.delete(`${window.name}/eachDeck/${id_constructed}`, config).then(
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
    setIsMouseOver(false);
    setIsTouchOver(false);
    e.dataTransfer.clearData();
    e.dataTransfer.setData("cardDeletion", cardId);
  };

  //Mana Cost icons handler

  //This is where I learned that JSX Elements are not strings nor objects, they are React Elements. You can put them in an array and send the array to be rendered just fine.
  function costIconHandler(theCardCost) {
    if (theCardCost) {
      const sanitizedCost = theCardCost.split(/(\{.*?\})/).filter(Boolean).map(cost => cost.replace(/\{|\}/g, ""));
      const resultElements = [];

      for (let i = 0; i < sanitizedCost.length; i++) {
        //if it's single character and it's special character or number
        
        if ((sanitizedCost[i].charCodeAt(0) <= 57) && (sanitizedCost[i].length === 1)) {
          resultElements.push(
            <div key={i} className={styles.colorlessIcon}>
              {sanitizedCost[i]}
            </div>
          );
        } else if (sanitizedCost[i] === "P") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={phyrexian}
              width="13"
              alt="phyrexian-logo"
            />
          );
        } else if (sanitizedCost[i] === "B/P") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={phyrexianBlack}
              width="13"
              alt="phyrexianBlack-logo"
            />
          );
        } else if (sanitizedCost[i] === "U/P") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={phyrexianBlue}
              width="13"
              alt="phyrexianBlue-logo"
            />
          );

        } else if (sanitizedCost[i] === "G/P") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={phyrexianGreen}
              width="13"
              alt="phyrexianGreen-logo"
            />
          );

        } else if (sanitizedCost[i] === "R/P") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={phyrexianRed}
              width="13"
              alt="phyrexianRed-logo"
            />
          );

        } else if (sanitizedCost[i] === "W/P") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={phyrexianWhite}
              width="13"
              alt="phyrexianWhite-logo"
            />
          );

        } else if (sanitizedCost[i] === "2/B") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={twoBlack}
              width="13"
              alt="two or Black-logo"
            />
          );
        } else if (sanitizedCost[i] === "2/U") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={twoBlue}
              width="13"
              alt="two or Blue-logo"
            />
          );
        } else if (sanitizedCost[i] === "2/G") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={twoGreen}
              width="13"
              alt="two or Green-logo"
            />
          );
        } else if (sanitizedCost[i] === "2/R") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={twoRed}
              width="13"
              alt="two or Red-logo"
            />
          );
        } else if (sanitizedCost[i] === "2/W") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={twoWhite}
              width="13"
              alt="two or White-logo"
            />
          );

        } else if (sanitizedCost[i] === "B/G") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={blackGreen}
              width="13"
              alt="blackGreen-logo"
            />
          );
        } else if (sanitizedCost[i] === "B/R") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={blackRed}
              width="13"
              alt="blackRed-logo"
            />
          );

        } else if (sanitizedCost[i] === "U/B") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={blueBlack}
              width="13"
              alt="blueBlack-logo"
            />
          );
        } else if (sanitizedCost[i] === "U/R") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={blueRed}
              width="13"
              alt="blueRed-logo"
            />
          );

        } else if (sanitizedCost[i] === "G/U") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={greenBlue}
              width="13"
              alt="greenBlue-logo"
            />
          );

        } else if (sanitizedCost[i] === "G/W") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={greenWhite}
              width="13"
              alt="greenWhite-logo"
            />
          );
        } else if (sanitizedCost[i] === "R/G") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={redGreen}
              width="13"
              alt="redGreen-logo"
            />
          );
        } else if (sanitizedCost[i] === "R/W") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={redWhite}
              width="13"
              alt="redWhite-logo"
            />
          );
        } else if (sanitizedCost[i] === "W/B") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={whiteBlack}
              width="13"
              alt="whiteBlack-logo"
            />
          );
        } else if (sanitizedCost[i] === "W/U") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={whiteBlue}
              width="13"
              alt="whiteBlue-logo"
            />
          );
        } else if (sanitizedCost[i] === "C") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={colorless}
              width="13"
              alt="colorless-logo"
            />
          );
        } else if (sanitizedCost[i] === "B") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={black}
              width="13"
              alt="black-logo"
            />
          );
        } else if (sanitizedCost[i] === "G") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={green}
              width="13"
              alt="green-logo"
            />
          );
        } else if (sanitizedCost[i] === "R") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={red}
              width="13"
              alt="red-logo"
            />
          );
        } else if (sanitizedCost[i] === "U") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={blue}
              width="13"
              alt="blue-logo"
            />
          );
        } else if (sanitizedCost[i] === "W") {
          resultElements.push(
            <img
              className={styles.coloredIcon}
              key={i}
              src={white}
              width="13"
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

    const cardWidth = 258;
    const cardHeight = 360;

    // Calculate the X position of the card
    const cardX = cardRect.left;

    // Calculate the X position of the card
    const cardY = cardRect.top;
    // Calculate the amount by which the scaled copy should be shifted to the center
    const shift = cardWidth / 2;

    // Get the width of the viewport
    const viewportWidth = window.innerWidth;
    // Get the height of the viewport
    const viewportHeight = window.innerHeight;
    // Calculate the X position where the scaled copy should be centered
    const centerX = viewportWidth / 2;

    // Check if the hovered card is on the left side of the screen
    const isOnLeftSide = cardX < centerX - shift;

    const x = e.clientX - cardRect.left - card.offsetWidth / 2 + 175;
    const y = e.clientY - cardRect.top - card.offsetHeight / 2;
    const xRight = e.clientX - cardRect.left - card.offsetWidth / 2 - 150;
    const z = e.clientY - cardRect.top - card.offsetHeight / 2 + 50;
    const s = e.clientY - cardRect.top - card.offsetHeight / 2 - 350;

    const w = e.clientX - cardRect.left - card.offsetWidth / 2 - 12;

    // Update the scaled card's position

    if (table === "deck") {
      if (viewportWidth < 445) {
        if (viewportHeight < cardY + 30 + cardHeight) {
          setScaledCardPosition({ x: w, y: s });
        } else setScaledCardPosition({ x: w, y: z });
      } else {
        if (viewportHeight < cardY + 30 + cardHeight) {
          if (isOnLeftSide) {
            setScaledCardPosition({ x, y: s + 70 });
          } else {
            setScaledCardPosition({ x: xRight, y: s + 70 });
          }
        } else {
          if (isOnLeftSide) {
            setScaledCardPosition({ x, y });
          } else {
            setScaledCardPosition({ x: xRight, y });
          }
        }
      }
    } else {
      //the case for SideBox
      setScaledCardPosition({ x: 350, y: z + 150 });
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
        <div>
          <div
            className={styles.MiniCard}
            onLoad={changeCardClass}
            onClick={deleteFromCollection}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            draggable="true"
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
          </div>
          <div
            className={styles.Card}
            style={{
              position: "fixed",
              right: `${scaledCardPosition.x}px`,
              top: `${scaledCardPosition.y}px`,
              display: isMouseOver || istouchOver ? "block" : "none",
            }}
          >
            <img
              style={{
                height: "350px",
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
          style={{
            position: "relative",
          }}
        >
          <div
            className={styles.MinierCard}
            onLoad={changeCardClass}
            onClick={deleteFromDeck}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            draggable="true"
            onDragStart={(e) => handleOnDrag(e, id_constructed)}
            onTouchStart={handleTouchEnter}
            onTouchEnd={handleTouchLeave}
            onTouchMove={handleMouseMove}
          >
            <div className={styles.Count}>
              <p>{count}x</p>
            </div>

            <div className={styles.Mainier}>
              <span>{cardName}</span>
              <span className={styles.cardCost}>{cardCost}</span>
            </div>
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
