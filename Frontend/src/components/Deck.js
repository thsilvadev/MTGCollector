import { useEffect, useState } from "react";
import Axios from 'axios';
import { useAuthHeader } from "react-auth-kit";


import styles from "../styles/Deck.module.css";

const Deck = ({ colorIdentity, description, id_deck, name }) => {

const [deckCards, setDeckCards] = useState([])

const deckCardCount = deckCards.length;


  const handleMouseOver = (e) => {

    if (e) {
      return styles.mouseOver
    } else {
      return styles.idle
    }


  }

   //Headers configuration
   const authHeader = useAuthHeader()
  
   const config = {
     headers:{
       authorization: authHeader()
     }
   }

  useEffect(() => {
    Axios.get(`${window.name}/eachDeck/${id_deck}`, config).then(
      (response) => {
        setDeckCards(response.data);
      }
    );
  }, [id_deck]);

  return (
    <div className="col-12 col-sm-6 col-lg-4 col-xl-3">
      <div className={styles.deckContainer} onMouseOver={handleMouseOver}>
        <div className={styles.deck}>
          <p>Deck name:{name}</p>
          <p>Description: {description}</p>
          <p>Cards: {deckCardCount}</p>
          <p>Color: {colorIdentity}</p>
        </div>
      </div>
    </div>
  );
};

export default Deck;
