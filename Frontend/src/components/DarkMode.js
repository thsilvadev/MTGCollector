import React, { useState, useEffect } from "react";
import { ReactComponent as Sun } from "../images/Sun.svg";
import { ReactComponent as Moon } from "../images/Moon.svg";
import "../styles/DarkMode.css";

const DarkMode = ({ navbarToggler, theme, handleSetTheme }) => {
  const positionHandler = navbarToggler ? "dark_mode" : "toggled_dark_mode";

  // const selectedTheme = localStorage.getItem("selectedTheme");

  const isThemeDark = theme === "dark";

  // State variable to store the checkbox state
  const [isChecked, setIsChecked] = useState(isThemeDark);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {

    setIsLoading(false);

    // if (selectedTheme === "dark") {
    //   setIsChecked(true);
    // } else {
    //   setIsChecked(false);
    // }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      handleSetTheme(isChecked ? 'dark' : 'light')
    }
  }, [isChecked, isLoading, handleSetTheme]);

  // Function to handle checkbox change
  const handleCheckboxChange = () => {
    setIsChecked(!isChecked); // Toggle the state
  };

  return (
    <div className={positionHandler}>
      <input
        className="dark_mode_input"
        type="checkbox"
        id="darkmode-toggle"
        checked={isChecked}
        onChange={handleCheckboxChange}
      />
      <label className="dark_mode_label" htmlFor="darkmode-toggle">
        <Sun />
        <Moon />
      </label>
    </div>
  );
};

export default DarkMode;
