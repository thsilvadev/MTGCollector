import cameraImg from "../images/camera.png";
import React, { useState } from "react";
import styles from "../styles/Camera.module.css";
import OpenCamera from "./OpenCamera";
import { useAuthUser } from "react-auth-kit";
import { useNavigate } from "react-router-dom";

function Camera({ fetchByDetection }) {
  const [openCamera, setOpenCamera] = useState(false);
  const auth = useAuthUser();
  const navigate = useNavigate();

  const handleClick = () => {
    if (!auth()) {
      navigate("/login");
      return;
    }
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
