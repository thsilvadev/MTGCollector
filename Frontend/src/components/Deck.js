import { useState } from "react";
import Axios from "axios";
import { useAuthHeader } from "react-auth-kit";
import { useNavigate } from "react-router-dom";

import styles from "../styles/Deck.module.css";

import pencil from "../images/pencil.png";

const Deck = ({
  colorIdentity,
  description,
  id_deck,
  name,
  toggler,
  cardCount,
}) => {
  const navigate = useNavigate();
  // Define the selected property (it can be null or a string)
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseEnter = (e) => {
    if (e) {
      setIsHovering(true);
    }
    console.log("is hovering: ", isHovering);
  };

  const handleMouseLeave = (e) => {
    if (e) {
      setIsHovering(false);
    }
    console.log("is hovering: ", isHovering);
  };

  const hoveringClass = isHovering ? styles.btnClose : styles.hide;

  //Headers configuration
  const authHeader = useAuthHeader();

  const config = {
    headers: {
      authorization: authHeader(),
    },
  };

  const deleteDeck = (e) => {
    e.stopPropagation(); //this is for not triggering parent element onClick event.
    if (window.confirm(`You're deleting this deck. Confirm?`)) {
      Axios.delete(`${window.name}/decks/${id_deck}`, config).then(() => {
        console.log(`requested to delete ${name} from collection`);
        toggler();
      });
    }
  };

  const updateDeck = (e) => {
    e.stopPropagation(); //this is for not triggering parent element onClick event.
    let newDeckName = prompt(`Type the new name of the deck:`, `${name}`);
    let newDeckDescription = prompt(
      `Type new deck description:`,
      `${description}`
    );
    try {
      Axios.put(
        `${window.name}/decks/${id_deck}`,
        {
          name: newDeckName,
          description: newDeckDescription,
        },
        config
      ).then(() => {
        console.log(`requested to update deck "${name}"`);
        toggler();
      });
    } catch (error) {
      console.error("Update Failed: ", error);
    }
  };

  const handleClick = () => {
    navigate(`/collection?selected=${id_deck}`);
  };

  return (
    <div className="col-12 col-sm-6 col-lg-4 col-xl-3">
      <div
        className={styles.deckContainer}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <button className={hoveringClass} onClick={deleteDeck}>
          &times;
        </button>
        <button
          className={` ${hoveringClass} ${styles.edit}`}
          onClick={updateDeck}
        >
          <img src={pencil} width="26px" alt="edit" />
        </button>
        <div className={styles.deck}>
          <p>Deck name:{name}</p>
          <p>Description: {description}</p>
          <p>Cards: {cardCount}</p>
          <p>Color: {colorIdentity}</p>
        </div>
      </div>
    </div>
  );
};

export default Deck;
