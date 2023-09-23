//styles
import styles from "../styles/Decks.module.css";

//components
import PrevNext from "../components/PrevNext";
import Deck from "../components/Deck";

//tools
import { React, useState, useEffect } from "react";
import Axios from "axios";
import { useAuthHeader } from "react-auth-kit";

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
  const toggleRefresh = debounce(() => {
    setRefresh((prevRefresh) => !prevRefresh);
  }, 450);

  //Getting decks

  //Headers configuration
  const authHeader = useAuthHeader();

  const config = {
    headers: {
      authorization: authHeader(),
    },
  };

  useEffect(() => {
    Axios.get(`${window.name}/decks/${page}`, config)
      .then((response) => {
        setDecks(response.data);
      })
      .then(console.log("toggling refresher:", refresh));
  }, [page, refresh]); //will have to include config here

  //Posting decks

  const createDeck = () => {
    if (decks.length >= 15) {
      alert(
        "You have reached the maximum number of decks. Please delete some to free space or donate for 100 deck slots."
      );
    } else {
      let deckName = prompt(`What is the name of the deck?`, "Default");
      if (deckName !== null) {
        let deckDescription = prompt(`Describe your deck`, "...");
        if (deckDescription !== null) {
          Axios.post(
            `${window.name}/decks`,
            {
              name: deckName,
              description: deckDescription,
              color: "",
              card_count: 0,
              id_deck: null,
            },
            config
          ).then(() => toggleRefresh());
        }
      }
    }
  };

  //Below certain widthView, deck container changes from justify-content-start to justify-content-center [RESPONSIVENESS]
  const [isWideScreen, setIsWideScreen] = useState(true);

  const updateScreenSize = () => {
    const screenWidth = window.innerWidth;
    const breakpoint = 575; // Set your desired breakpoint in pixels here
    setIsWideScreen(screenWidth >= breakpoint);
  };

  // Add a resize event listener to update the state on window resize
  useEffect(() => {
    updateScreenSize(); // Initial update
    window.addEventListener("resize", updateScreenSize);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("resize", updateScreenSize);
    };
  }, []);

  const mobile = isWideScreen
    ? `justify-content-start`
    : `justify-content-center`;

  return (
    <div className={styles.Background}>
      <div className="container">
        <h1 className={styles.title}>Decks</h1>
        <div className={`row ${mobile}`}>
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
              toggler={toggleRefresh}
              cardCount={deck.card_count}
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
    </div>
  );
}

export default Decks;
