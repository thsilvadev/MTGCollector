//Styles
import styles from "../styles/SideBox.module.css";

//Tools
import React, { useState, useEffect, useRef } from "react";
import Axios from "axios";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useAuthHeader } from "react-auth-kit";
import { useNavigate } from "react-router-dom";

//Components
import MiniCard from "./MiniCard";
import PrevNext from "./PrevNext";

const SideBox = ({ modalToggler, refresher }) => {

  const navigate = useNavigate();


  //change css class when card is being dragged over the sidebar
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  const handleDragEnter = () => {
    setIsDraggedOver(true);
    console.log("drag entered");
  };

  const handleDragLeave = () => {
    setIsDraggedOver(false);
    console.log("drag leaved");
  };

  //make it a dropzone using `e.dataTransfer.getData`

  //postOnCollection
  const postOnCollection = (cardId) => {
    //Use prompt() method for card condition. Just for instance.

    Axios.post(
      `${window.name}/collection/`,
      {
        card_id: cardId,
        card_condition: `Undescribed`,
        id_collection:
          null /* later implement that. This could be for multiple collections */,
      },
      config
    ).then(() => {
      console.log(`Card posted of id: ${cardId}`);
      toggleRefresh();
    });
  };

  const handleDrop = (e) => {
    setIsDraggedOver(false);

    //check if LoggedIn
    if (authHeader()) {
      //on drop, get card ID
      const pickedCard = e.dataTransfer.getData("card");
      if (pickedCard) {
        postOnCollection(pickedCard);
        console.log("card Id:", pickedCard);
      } else if (!pickedCard) {
        console.log("no data was caught");
      }
    } else {
      alert("You must login");
      navigate("/login");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggedOver(true);
    console.log("drag over");
  };

  //Get cards from collection

  //cards
  const [cards, setCards] = useState([]);

  //page value
  const [page, setPage] = useState(0);

  const handlePage = (pageData) => {
    setPage(pageData);
  };

  //Total cards in collection
  const [totalCards, setTotalCards] = useState(0);

  //get filtered and paginated Collection Cards in real time

  // Add a state variable to trigger card refresh
  const [refreshCards, setRefreshCards] = useState(false);

  //Debouncer
  const debounce = (func, delay) => {
    let timerId;

    return (...args) => {
      clearTimeout(timerId);

      timerId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // Function to toggle the refreshCards state
  const toggleRefresh = debounce(() => {
    setRefreshCards((prevRefresh) => !prevRefresh);
  }, 450);

  //Have to create a local state variable for refresher to work
  const [localRefreshCards, setLocalRefreshCards] = useState(false);

  useEffect(() => {
    setLocalRefreshCards(refresher);
  }, [refresher]);

  //Headers configuration
  const authHeader = useAuthHeader();

  const config = {
    headers: {
      authorization: authHeader(),
    },
  };

  useEffect(() => {
    //This is for adding cards
    console.log("logging liftedRefreshCards changing:", localRefreshCards);
    //This is for deleting cards
    console.log("logging refreshCards changing:", refreshCards);
    //GET 'EM!
    Axios.get(`${window.name}/collection/${page}`, config).then((response) => {
      setCards(response.data.cards);
      setTotalCards(response.data.total);
    });
  }, [page, refreshCards, localRefreshCards]);

  //css classes

  const boxClass = modalToggler ? styles.OpenBoxDiv : styles.ClosedBoxDiv;
  const uponDraggingItem = isDraggedOver ? styles.UponDraggedItem : "";

  //managing scroll to top when nextPrev clicked

  const scrollbarsRef = useRef(null);
  const buttonHandler = () => {
    scrollbarsRef.current.scrollToTop();
    console.log("scrolling top of sidebar");
  };

  return (
    <div>
      <div
        className={`${boxClass} ${uponDraggingItem}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        id="sidebar"
      >
        <h6>
          <a className={styles.Link} href="/collection">
            Collection
          </a>
        </h6>
        <span className={styles.total}>{totalCards} cards</span>
        <PrevNext
          onPageChange={handlePage}
          page={page}
          elementsArray={cards}
          where="sidebar"
          toggler={buttonHandler}
        />
        <Scrollbars
          style={{ width: "100%", height: "84%" }}
          ref={scrollbarsRef}
        >
          <div>
            {cards
              .map((card, key) => (
                <MiniCard
                  key={key}
                  id={card.id}
                  cost={card.manaCost}
                  name={card.name}
                  table="collection"
                  id_collection={card.id_collection}
                  isModalOpen={modalToggler}
                  count={card.countById}
                  toggle={toggleRefresh}
                  scryfallId={card.scryfallId}
                  types={card.types}
                  keywords={card.keywords}
                />
              ))
              .sort((a, b) => b - a)}
          </div>
        </Scrollbars>
      </div>
    </div>
  );
};

export default SideBox;
