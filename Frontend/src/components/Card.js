//SHIT DO DO FIRST

//imports
import { React, useState, useEffect } from "react";
import Axios from "axios";

import { useAuthHeader } from "react-auth-kit";

//styles

import styles from "../styles/Card.module.css";
import { useNavigate } from "react-router";
import Loading from "./Loading";

function Card({
  id,
  types,
  name,
  setCode,
  rarity,
  cost,
  condition,
  scryfallId,
  multiverseId,
  keywords,
  count,
  table,
  id_collection,
  refresh,
  getChosenDeck,
  getDeckCards,
  getCollectionCards,
}) {
  //Scryfall ID management

  const fileFace = "front";
  const fileType = "large";
  const fileFormat = ".jpg";
  const fileName = scryfallId;
  const dir1 = fileName.charAt(0);
  const dir2 = fileName.charAt(1);

  const imageUrl = `https://cards.scryfall.io/${fileType}/${fileFace}/${dir1}/${dir2}/${fileName}${fileFormat}`;

  //Loading Spinner
  const [isLoading, setIsLoading] = useState(true);
  const [ImgSrc, setImgSrc] = useState(null)
    
  useEffect(() => {
    // Reset loading state and image source when imageUrl changes
    setIsLoading(true);
    setImgSrc(null);
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setIsLoading(false);
      setImgSrc(imageUrl);
    };
 }, [imageUrl]);

  //Conditional CSS classes for exotic type cards

  const [battle, setBattle] = useState(false);
  const [plane, setPlane] = useState(false);
  const [collected, setCollected] = useState(false);

  //Navigation
  const navigate = useNavigate();

  const isBattleOrPlane =
    battle || plane ? styles.scaledPlaneOrBattle : styles.scaledCard;
  const isCollected = collected ? styles.Collected : styles.Card;

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
    } //Fuse cards act just like Battle cards so it's using the same class.
    if (table === "collection") {
      setCollected(true);
    } else {
      setCollected(false);
    }
  };

  //Click Handler
  const clickHandler = () => {
    if (table === "allCards") {
      postOnCollection();
    } else if (table === "collection") {
      deleteFromCollection();
    }
  };

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
    refresh();
  }, 450);

  //Post

  //Headers configuration
  const authHeader = useAuthHeader();

  const config = {
    headers: {
      authorization: authHeader(),
    },
  };

  //postOnCollection
  const postOnCollection = () => {
    //Use prompt() method for card condition. Just for instance.
    let cardCondition;
    console.log(authHeader())
    if (authHeader()) {
      let userCondition = prompt(
        `You're adding ${name} to your collection. What's it's condition?`,
        "Undescribed"
      );

      if (userCondition !== null) {
        if (userCondition === "") {
          cardCondition = `Undescribed`;
        } else {
          cardCondition = userCondition;
        }

        Axios.post(
          `${window.name}/collection/`,
          {
            card_id: id,
            card_condition: cardCondition,
            id_collection: null /* later implement that */,
          },
          config
        ).then(() => {
          console.log(`Card posted of id: ${id}`);
          toggleRefresh();
        });
      }
    } else {
      alert("You must login");
      navigate("/login");
      
    }
  };

  //Delete
  //Delete from Collection
  const deleteFromCollection = () => {
    if (
      window.confirm(`You're deleting ${name} from your collection. Confirm?`)
    ) {
      Axios.delete(`${window.name}/card/${id_collection}`, config)
        .then(console.log(`${name} deleted from collection`))
        .then(toggleRefresh());
    }
  };

  //How many in collection?

  //Quantity owned in collection and in wishlist
  const [collectionCard, setCollectionCard] = useState([]);
  const [isMouseOver, setIsMouseOver] = useState(false); // State to manage mouse hover
  const [istouchOver, setIsTouchOver] = useState(false); // State to manage touch hover

  //get
  const inCollection = () => {
    Axios.get(`${window.name}/card/${id}`, config).then((response) => {
      setCollectionCard(response.data);
    });
  };

  //if table = Collection, just set quantity got on prop 'count'
  const handleCollectionCard = () => {
    if (table === 'collection'){
      setCollectionCard([{
        id: id,
        countById: count,
      }])
    } else if (table === 'allCards'){
      inCollection();
    }
  }

  const handleMouseEnter = (e) => {
    HandleOffset(e);
    handleCollectionCard(); // Fetch data when mouse enters the card
    setIsMouseOver(true);
    console.log(isMouseOver);
  };

  const handleMouseLeave = () => {
    setIsMouseOver(false);
    setIsHoverable(false);
    console.log(isMouseOver);
  };

  const handleTouchEnter = (e) => {
    HandleOffset(e);
    handleCollectionCard(); // Fetch data when Touch enters the card
    setIsTouchOver(true);
    console.log(istouchOver);
  };

  const handleTouchLeave = () => {
    setIsHoverable(false);
    setIsTouchOver(false);
    console.log(istouchOver);
  };

  const renderer = () => {
    if (isMouseOver || istouchOver) {
      if (collectionCard.length === 0) {
        return <span>not obtained</span>;
      } else {
        return collectionCard.map((hoveredCard) => (
          <span key={hoveredCard.id}>
            on Collection: {hoveredCard.countById}
          </span>
        ));
      }
    } else {
      return null;
    }
  };

  //Drag and Drop (e.dataTransfer JS method)

  //DRAGGING FROM COLLECTION INTO DECK CASE - Checking if there are already 4 of it on deck OR if there is enough on Collection to put it.
  const isDraggable = (collectionId) => {
    let chosenDeck = getChosenDeck;

    if (chosenDeck !== null) {
      let collectionIdString = collectionId.toString(); //let's turn this id number into string

      let onDeckCard = getDeckCards.find(
        (card) => card.id_card.toString() === collectionIdString
      );
      let onCollectionCard = getCollectionCards.find(
        (card) => card.id_collection.toString() === collectionIdString
      );

      let onDeckCounter = onDeckCard ? onDeckCard.countById : 0;

      let onCollectionCounter = onCollectionCard
        ? onCollectionCard.countById
        : 0;

      let CardName = onCollectionCard.name;
      let nameCounter = 0;

      getDeckCards.forEach((card) => {
        if (card.name === CardName) {
          nameCounter += card.countById;
        }
      });

      let onCollectionSuperType = onCollectionCard.supertypes;

      if (onCollectionCounter - onDeckCounter <= 0) {
        return "You don't own that many of this card to put on your deck! First, add it to your collection.";
      } else if (
        (onDeckCounter >= 4 || nameCounter >= 4) &&
        onCollectionSuperType !== "Basic"
      ) {
        return "You have already 4 cards of this in the deck!";
      } else {
        return true;
      }
    }
  };

  //If Card is not collection card, making it All Card, it's draggable. But if it's a collection card, it may return true (draggable), or a string (undraggable)
  let isDraggableCall = id_collection ? isDraggable(id_collection) : true;

  //if isDraggableCall returns true, it's dragging anyway. So for the toggler, we want the true value. If it returns a string, it's false - not dragging.
  const isDraggableToggler =
    isDraggableCall === true && typeof isDraggableCall === "boolean"
      ? true
      : false;
  //If dragging, no string; if not dragging, this variable will get the returned string (which will be put in an overlay on collection card.)
  const isDraggableHover =
    isDraggableCall === true && typeof isDraggableCall === "boolean"
      ? ""
      : isDraggableCall;


  const draggableOverlay = isMouseOver || istouchOver ? styles.showingOverlay : styles.hiddenOverlay;

  const handleOnDrag = (e, cardId) => {
    setIsMouseOver(false);
    setIsTouchOver(false);
    e.dataTransfer.clearData();
    e.dataTransfer.setData("card", cardId);
  };

  //Handle table variation for dragStart event
  const handleTableDrag = () => {
    if (table === "allCards") {
      return (e) => handleOnDrag(e, id);
    } else if (table === "collection") {
      return (e) => handleOnDrag(e, id_collection);
    }
  };

  //Conditional CSS classes in spite of table for card container

  const isAllCards =
    table === "allCards"
      ? styles.CardContainer
      : styles.CollectionCardContainer;

  //conditional bootstrap class for the whole component
  const componentContainer =
    table === "allCards" ? "col-12 col-sm-6 col-lg col-xl" : "col";

  //Handling Scaled Copy on hover offset

  const [scaledCardClass, setScaledCardClass] = useState("");

  const [scaledCardPosition, setScaledCardPosition] = useState({
    x: -9999,
    y: -9999,
  });

  const [styleToggler, setStyleToggler] = useState(false);

  const scaledStyle = styleToggler
    ? {
        position: "absolute",
        left: `${scaledCardPosition.x}px`,
        top: `${scaledCardPosition.y}px`,
        display: isMouseOver || istouchOver ? "block" : "none",
      }
    : { display: isMouseOver || istouchOver ? "block" : "none" };

  const HandleOffset = (e) => {
    const card = e.currentTarget; // Get the hovered card element

    // Get the position of the hovered card relative to the viewport
    const cardRect = card.getBoundingClientRect();

    // Calculate the X position of the card
    const cardX = cardRect.left;

    const cardWidth = cardRect.width;

    // Get the width of the viewport
    const viewportWidth = window.innerWidth;

    // Calculate the amount by which the scaled copy should be shifted to the center
    const shift = cardWidth / 2;

    // Calculate the X position where the scaled copy should be centered
    const centerX = viewportWidth / 2;

    // Check if the hovered card is on the left side of the screen
    const isOnLeftSide = cardX < centerX - shift;

    // Now you can use isOnLeftSide to determine the position
    // and apply different styles or logic based on its position.
    // 363 is the width of the scaledCard.

    //for mouse position hover
    const x = e.clientX - cardRect.left - card.offsetWidth / 2 - 50;
    const y = e.clientY - cardRect.top - card.offsetHeight / 2 - 50;
    const xRight = e.clientX - cardRect.left - card.offsetWidth / 2 - 250;

    if (table === "allCards") {
      if (viewportWidth < 1064) {
        if (viewportWidth < 576) {
          //Disable Style Toggler
          setStyleToggler(false);
          //Disable Scaled Copy
          setScaledCardClass(styles.Disabled);
          //Enable Hover
          setIsHoverable(true);
        } else {
          setStyleToggler(true);
          setScaledCardClass(styles.Default);
          setIsHoverable(false);
          if (isOnLeftSide) {
            setScaledCardPosition({ x, y });
          } else {
            setScaledCardPosition({ x: xRight, y });
          }
        }
      } else {
        setStyleToggler(false);
        setIsHoverable(false);
        if (isOnLeftSide) {
          if (battle || plane) {
            setScaledCardClass(styles.LeftPlaneOrBattle);
          } else {
            setScaledCardClass(styles.Left);
          }
        } else {
          if (battle || plane) {
            setScaledCardClass(styles.RightPlaneOrBattle);
          } else {
            setScaledCardClass(styles.Right);
          }
        }
      }

      console.log(scaledCardClass, isHoverable);
    } else if (table === "collection") {
      setStyleToggler(false);
      if (viewportWidth < 972) {
        //Disable Scaled Copy
        setScaledCardClass(styles.Disabled);
        //Enable Hover
        setIsHoverable(true);
      } else {
        setIsHoverable(false);
        if (isOnLeftSide) {
          if (battle || plane) {
            setScaledCardClass(styles.LeftPlaneOrBattle);
          } else {
            setScaledCardClass(styles.Left);
          }
        } else {
          if (battle || plane) {
            setScaledCardClass(styles.RightPlaneOrBattle);
          } else {
            setScaledCardClass(styles.Right);
          }
        }
      }
    }
  };

  //Toggle hover on whenever scaledCard is disabled.
  const [isHoverable, setIsHoverable] = useState(false);
  const hoverableClass = isHoverable ? styles.Hover : "";
  const battleClass =
    isHoverable && (battle || plane) ? styles.scaledPlaneOrBattle : "";

  const draggableClass = isDraggableToggler || !getChosenDeck ? "" : styles.Undraggable;


  return (
    <div className={componentContainer}>
      {isLoading ? <Loading page={table}/> : <div className={`${isAllCards}`}>
        <img
          src={ImgSrc}
          onClick={clickHandler}
          alt="card"
          className={`${isCollected} ${hoverableClass} ${battleClass} ${draggableClass}`}
          onLoad={changeCardClass}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          draggable={isDraggableToggler}
          onDragStart={(e) => handleTableDrag()(e)}
          onMouseMove={HandleOffset}
          onTouchStart={handleTouchEnter}
          onTouchEnd={handleTouchLeave}
          onTouchMove={HandleOffset}
        />
        <div className={scaledCardClass} style={scaledStyle}>
          <img
            className={`${isBattleOrPlane}`}
            src={ImgSrc}
            alt="card"
          />
        </div>
        <div className={draggableOverlay}>
          <span>{isDraggableHover}</span>
        </div>

        <div className={styles.CardOverlay}>
          <p>{renderer()}</p>
        </div>
      </div>
      }
      
    </div>
  );
}

export default Card;
