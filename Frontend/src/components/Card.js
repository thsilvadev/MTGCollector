//SHIT DO DO FIRST

//imports
import { React, useState } from "react";
import Axios from "axios";

//styles

import styles from "../styles/Card.module.css";

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
  table,
  id_collection,
  refresh,
}) {
  //Scryfall ID management

  const fileFace = "front";
  const fileType = "large";
  const fileFormat = ".jpg";
  const fileName = scryfallId;
  const dir1 = fileName.charAt(0);
  const dir2 = fileName.charAt(1);

  //Conditional CSS classes for exotic type cards

  const [battle, setBattle] = useState(false);
  const [plane, setPlane] = useState(false);
  const [collected, setCollected] = useState(false);

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

  //postOnCollection
  const postOnCollection = () => {
    //Use prompt() method for card condition. Just for instance.
    let cardCondition;
    let userCondition = prompt(
      `You're adding ${name} to your collection. What's it's condition?`,
      "Undescribed"
    );

    if (userCondition !== null) {
      if (userCondition === "") {
        alert(`no condition info was put along with your new card`);
        cardCondition = `Undescribed`;
      } else {
        cardCondition = userCondition;
        alert(`${cardCondition} ${name} card was put into your collection!`);
      }

      Axios.post(`${window.name}/collection/`, {
        card_id: id,
        card_condition: cardCondition,
        id_collection: null /* later implement that */,
      }).then(() => {
        console.log(`Card posted of id: ${id}`);
        toggleRefresh();
      });
    }
  };

  //Delete
  //Delete from Collection
  const deleteFromCollection = () => {
    if (
      window.confirm(`You're deleting ${name} from your collection. Confirm?`)
    ) {
      Axios.delete(`${window.name}/card/${id_collection}`)
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
    Axios.get(`${window.name}/card/${id}`).then((response) => {
      setCollectionCard(response.data);
    });
  };

  const handleMouseEnter = (e) => {
    HandleOffset(e);
    inCollection(); // Fetch data when mouse enters the card
    setIsMouseOver(true);
  };

  const handleMouseLeave = () => {
    setIsMouseOver(false);
    setIsHoverable(false);
  };

  const handleTouchEnter = (e) => {
    HandleOffset(e);
    inCollection(); // Fetch data when Touch enters the card
    setIsTouchOver(true);
    console.log(istouchOver)
  };

  const handleTouchLeave = () => {
    setIsHoverable(false);
    setIsTouchOver(false);
    console.log(istouchOver)
  };

  const renderer = () => {
  
    if (isMouseOver || istouchOver){
      if (collectionCard.length === 0) {
        return <span>not obtained</span>;
      } else {
        console.log('overlay rendered');
        return collectionCard.map((hoveredCard) => (
          <span key={hoveredCard.id}>on Collection: {hoveredCard.countById}</span>
        ));
        
      }
    } else {
      return null;
    }
      
    
  };

  //Drag and Drop (e.dataTransfer JS method)

  const handleOnDrag = (e, cardId) => {
    console.log("dragStart");
    e.dataTransfer.clearData();
    e.dataTransfer.setData("card", cardId);
  };

  //Handle table variation for dragStart event
  const handleTableDrag = () => {
    setIsMouseOver(false);
    setIsTouchOver(false);
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
    table === "allCards" ? "col-12 col-sm-6 col-lg-4 col-xl-3" : "col";

  //Handling Scaled Copy on hover offset

  const [scaledCardClass, setScaledCardClass] = useState("");

  const [scaledCardPosition, setScaledCardPosition] = useState({
    x: -9999,
    y: -9999,
  });

  const [styleToggler, setStyleToggler] = useState(false);

  const scaledStyle = styleToggler ? {
    position: "absolute",
    left: `${scaledCardPosition.x}px`,
    top: `${scaledCardPosition.y}px`,
    display: isMouseOver || istouchOver ? "block" : "none",
  } : { display: isMouseOver || istouchOver ? "block" : "none",
} ;

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
    const shift = cardWidth / 2 ;

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
          setScaledCardClass(styles.Default)
          setIsHoverable(false);
          if (isOnLeftSide) {
            setScaledCardPosition({ x, y });
            console.log("isOnLeftSide");
          } else {
            setScaledCardPosition({ x: xRight, y });
            console.log("isNotOnLeftSide");
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

        console.log(scaledCardClass);
      }
    }
  };

  //Toggle hover on whenever scaledCard is disabled.
  const [isHoverable, setIsHoverable] = useState(false);
  const hoverableClass = isHoverable ? styles.Hover : "";

  return (
    <div className={componentContainer}>
      <div className={`${isAllCards}`}>
        <img
          src={`https://cards.scryfall.io/${fileType}/${fileFace}/${dir1}/${dir2}/${fileName}${fileFormat}`}
          onClick={clickHandler}
          alt="card"
          className={`${isCollected} ${hoverableClass}`}
          onLoad={changeCardClass}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          draggable={true}
          onDragStart={(e) => handleTableDrag()(e)}
          onMouseMove={HandleOffset}
          onTouchStart={handleTouchEnter}
          onTouchEnd={handleTouchLeave}
          onTouchMove={HandleOffset}
        />
        <div
          className={scaledCardClass}
          style={scaledStyle}
        >
          <img
            className={`${isBattleOrPlane}`}
            src={`https://cards.scryfall.io/${fileType}/${fileFace}/${dir1}/${dir2}/${fileName}${fileFormat}`}
            alt="card"
          />
        </div>

        <div className={styles.CardOverlay}>
          <p>{renderer()}</p>
        </div>
      </div>
    </div>
  );
}

export default Card;
