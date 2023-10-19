import React, { useState, useEffect } from "react";
import styles from "../styles/SideBar.module.css";
import SideBox from "../components/SideBox";

import toggler from "../images/toggler.png";

const SideBar = ({modalHandler, refresh}) => {

    //Modal engine
  const [sideBar, setSideBar] = useState(false);

  const showSideBar = () => setSideBar(!sideBar);

  //Statelifting modal

  // Use useEffect to call modalHandler when sideBar changes
  useEffect(() => {
    modalHandler(sideBar);
  }, [sideBar, modalHandler]);

  //Toggler CSS class change

  const togglerClass = sideBar ? styles.OpenToggler : styles.ClosedToggler;

  //modal won't work below certain resolution

  const [isWideScreen, setIsWideScreen] = useState(true);

  const updateScreenSize = () => {
    const screenWidth = window.innerWidth;
    const breakpoint = 850; // Set your desired breakpoint in pixels here

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

  return (
    <div className="container">
        {isWideScreen && 
      <div className={togglerClass} onClick={showSideBar}>
        <img
          src={toggler}
          width="30"
          alt="button to open and close Collection side bar."
        />
      </div> }
      <div className="row">
        <SideBox modalToggler={sideBar} refresher={refresh}/>
      </div>
      
    </div>
  );
};

export default SideBar;
