//styles
import styles from "../styles/Decks.module.css";

//components
import PrevNext from "../components/PrevNext";
import Deck from "../components/Deck";
import AppModal from "../components/AppModal";

//tools
import { React, useState, useEffect } from "react";
import Api from "../Api";
import { useAuthHeader } from "react-auth-kit";
import { toast } from 'react-toastify';
import { useI18n } from '../i18n/LanguageContext';

//imgs
import newDeck from "../images/newDeck.png";

function Decks() {
  const [decks, setDecks] = useState([]);
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(false);
  const [modal, setModal] = useState(null);
  const { t } = useI18n();

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
    Api.get(`/decks/${page}`, config)
      .then((response) => {
        setDecks(response.data);
      })
      .then(console.log("toggling refresher:", refresh));
  }, [page, refresh]); //will have to include config here

  //Posting decks

  const createDeck = () => {
    if (decks.length >= 15) {
      toast.warning(t('deck.maxDecks'));
    } else {
      setModal({
        type: 'deck-edit',
        title: t('deck.createTitle'),
        deckName: '',
        deckDesc: '',
        deckIsCommander: false,
        confirmLabel: t('deck.createBtn'),
        onCancel: () => setModal(null),
        onConfirm: (deckName, deckDescription, isCommanderFlag) => {
          setModal(null);
          if (!deckName) return;
          Api.post(
            `/decks`,
            {
              name: deckName,
              description: deckDescription,
              color: '',
              card_count: 0,
              id_deck: null,
              isCommander: isCommanderFlag ? 1 : 0,
            },
            config
          ).then(() => toggleRefresh());
        },
      });
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
      {modal && <AppModal {...modal} />}
      <div className="container">
        <h1 className={styles.title}>{t('decks.title')}</h1>
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
              isCommander={deck.isCommander}
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
