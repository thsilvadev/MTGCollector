//styles
import styles from "../styles/Decks.module.css";

//components
import PrevNext from "../components/PrevNext";
import Deck from "../components/Deck";

//tools
import { React, useState, useEffect} from 'react';
import Axios from 'axios';

//imgs
import newDeck from '../images/newDeck.png'

function Decks() {
  const [decks, setDecks] = useState([]);
  const [page, setPage] = useState(0);
  const handlePage = (pageData) => {
    setPage(pageData);
  };

  useEffect(() => {
    Axios.get(`http://192.168.0.82:3344/decks/${page}`).then(
      (response) => {
        setDecks(response.data);
      }
    );
  }, [page]);

  const createDeck = () => {

    let deckName = prompt(
        `What is the name of the deck?`, "Default"
    )
    let deckDescription = prompt(
        `Describe your deck`, "..."
    )
    if ((deckName !== null) && (deckDescription !== null)){
        Axios.post(`http://192.168.0.82:3344/decks`, {
       name: deckName,
       description: deckDescription,
       color: '',
       card_count: 0,
       id_deck: null
    })
    }
    
  }

  return (
    <div>
      <h1 className={styles.title}>Decks</h1>
      <div className={styles.decksContainer}>
        <div className={styles.addDeck} onClick={createDeck}>
            <img src={newDeck} width='200' alt="create your deck" />
        </div>
        
        <div className="row justify-content-center">
        {decks.map((deck, key) => (
            <Deck 
                key={key}
                cardCount={deck.card_count}
                colorIdentity={deck.color}
                description={deck.description}
                id_deck={deck.id_deck}
                name={deck.name}
            />
        ))}
        </div>

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
