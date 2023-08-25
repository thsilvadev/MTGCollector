//Styles
import styles from "../styles/MiniCard.module.css";

//Tools
import Axios from "axios";

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
      //toggle();
    }
  };

  //Delete from Deck
  const deleteFromDeck = () => {
    if (
      window.confirm(`You're deleting ${name} from your collection. Confirm?`)
    ) {
      Axios.delete(`${window.name}/eachDeck/${id_constructed}`).then(
        console.log(`requested to delete ${name} from collection`)
      );
      //toggle();
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

  //Render

  if (isModalOpen) {
    if (table === "collection") {
      return (
        <div
          className={styles.MiniCard}
          onClick={deleteFromCollection}
          draggable={true}
          onDragStart={(e) => handleOnDrag(e, id_collection)}
        >
          <div className={styles.Count}>
            <p>{count}x</p>
          </div>
          <div className={styles.Main}>
            <span>{cardName}</span>
            <span className={styles.cardCost}>{cardCost}</span>
          </div>
        </div>
      );
    } else if (table === "deck") {
      return (
        <div
          className={styles.MinierCard}
          onClick={deleteFromDeck}
          draggable={true}
          onDragStart={(e) => handleOnDrag(e, id_constructed)}
        >
          <div className={styles.Count}>
            <p>{count}x</p>
          </div>
          <div className={styles.Main}>
            <span>{cardName}</span>
            <span className={styles.cardCost}>{cardCost}</span>
          </div>
        </div>
      );
    }
  }
};

export default MiniCard;
