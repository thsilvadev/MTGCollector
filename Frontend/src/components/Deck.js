import { useState } from "react";
import Axios from "axios";
import { useAuthHeader } from "react-auth-kit";

import styles from "../styles/Deck.module.css";

const Deck = ({ colorIdentity, description, id_deck, name, toggler, cardCount }) => {


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


  const deleteDeck = () => {
    if (window.confirm(`You're deleting this deck. Confirm?`)) {
      Axios.delete(`${window.name}/decks/${id_deck}`, config).then(() => {
        console.log(`requested to delete ${name} from collection`);
        toggler();
      });
    }
  };

  return (
    <div className="col-12 col-sm-6 col-lg-4 col-xl-3">
      <div
        className={styles.deckContainer}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button className={hoveringClass} onClick={deleteDeck}>
          &times;
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
