import cameraImg from "../images/camera.png";
import React, { useState } from "react";
import styles from "../styles/Camera.module.css";
import OpenCamera from "./OpenCamera";

function Camera({ fetchByDetection }) {
  const [openCamera, setOpenCamera] = useState(false);

  const handleClick = () => {
    setOpenCamera(!openCamera)
  }

  const isCameraOpen = !openCamera ? (
    <img className={styles.button} src={cameraImg} onClick={handleClick}></img>
  ) : (
    <OpenCamera close = {handleClick} fetchName = {fetchByDetection}/>
  );
  return <div>{isCameraOpen}</div>;
}

export default Camera;
