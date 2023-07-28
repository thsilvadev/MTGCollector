import styles from "../styles/SideBox.module.css";
import React, { useState } from "react";

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
  }
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="col-lg-3">
      <div
        className={`${boxClass} ${uponDraggingItem}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}

        onDragOver={handleDragOver}
      >
        <p>Collection</p>
      </div>
    </div>
  );
};

export default SideBox;
