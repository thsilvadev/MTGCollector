//Styles
import styles from "../styles/SideBox.module.css";

//Tools
import React, { useState, useEffect } from "react";
import Axios from "axios";

//Components
import MiniCard from "./MiniCard";
import PrevNext from "./PrevNext";

const SideBox = ({ active }) => {
  //change css class when card is being dragged over the sidebar
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  const handleDragEnter = () => {
    setIsDraggedOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggedOver(false);
  };

  const boxClass = active ? styles.OpenBoxDiv : styles.ClosedBoxDiv;
  const uponDraggingItem = isDraggedOver
    ? styles.UponDraggedItem
    : styles.OpenBoxDiv;

  //make it a dropzone

  const handleDrop = (e) => {
    const pickedCard = e.dataTransfer.getData("pickedCard");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
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

  //get filtered and paginated Collection Cards in real time

  // Add a state variable to trigger card refresh
  const [refreshCards, setRefreshCards] = useState(false);

  // Function to toggle the refreshCards state
  const toggleRefresh = () => {
    setRefreshCards((prevRefresh) => !prevRefresh);
    console.log(refreshCards);
  };

  useEffect(() => {
    Axios.get(`http://192.168.0.82:3344/collection/${page}`).then(
      (response) => {
        setCards(response.data);
      }
    );
  }, [page, refreshCards]);

  return (
    <div className="col-12">
      <div
        className={`${boxClass} ${uponDraggingItem}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <h6><a className={styles.Link} href="/collection">Collection</a></h6>
        <PrevNext onPageChange={handlePage} page={page} cardTotal={cards} where='sidebar'/>
        <div className="row justify-content-around">
          {cards
            .map((card, key) => (
              <MiniCard
                key={key}
                id={card.id}
                cost={card.manaCost}
                name={card.name}
                table="collection"
                id_collection={card.id_collection}
                isModalOpen={active}
                count={card.countById}
                toggle={toggleRefresh}
              />
            ))
            .sort((a, b) => b - a)}
        </div>
        
      </div>
      
    </div>
  );
};

export default SideBox;
