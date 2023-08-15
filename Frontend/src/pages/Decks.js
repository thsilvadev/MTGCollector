//styles
import styles from "../styles/Decks.module.css";

//components
import PrevNext from "../components/PrevNext";
import Deck from "../components/Deck";

//tools
import { React, useState, useEffect } from "react";
import Axios from "axios";

//imgs
import newDeck from "../images/newDeck.png";

function Decks() {
  const [decks, setDecks] = useState([]);
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(false);

  const handlePage = (pageData) => {
    setPage(pageData);
  };

  //Debouncer
  const debounce = (func, delay) => {
    let timerId;

    return (...args) => {
      clearTimeout(timerId);

      timerId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  };

  // Function to toggle the refreshCards state
  const toggleRefresh = () => {
    debounce(
      setRefresh((prevRefresh) => !prevRefresh),
      450
    );
  };

  useEffect(() => {
    Axios.get(`http://192.168.0.82:3344/decks/${page}`)
      .then((response) => {
        setDecks(response.data);
      })
      .then(console.log("toggling refresher:", refresh));
  }, [page, refresh]);

  const createDeck = () => {
    let deckName = prompt(`What is the name of the deck?`, "Default");
    let deckDescription = prompt(`Describe your deck`, "...");
    if (deckName !== null && deckDescription !== null) {
      Axios.post(`http://192.168.0.82:3344/decks`, {
        name: deckName,
        description: deckDescription,
        color: "",
        card_count: 0,
        id_deck: null,
      }).then(toggleRefresh());
    }
  };

  return (
    <div className="container">
      <h1 className={styles.title}>Decks</h1>
      <div className="row justify-content-start">
        <div className="col-12 col-sm-6 col-lg-4 col-xl-3">
          <div className={styles.addDeck} onClick={createDeck}>
            <img
              src={newDeck}
              className={styles.newDeckImg}
              alt="create your deck"
            />
          </div>
        </div>

        {decks.map((deck, key) => (
          <Deck
            key={key}
            colorIdentity={deck.color}
            description={deck.description}
            id_deck={deck.id_deck}
            name={deck.name}
          />
        ))}
      </div>

      <PrevNext
        onPageChange={handlePage}
        page={page}
        elementsArray={decks}
        where="page"
      />
    </div>
  );
}

export default Decks;
