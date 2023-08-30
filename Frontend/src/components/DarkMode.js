import React, { useState, useEffect } from "react";
import { ReactComponent as Sun } from "../images/Sun.svg";
import { ReactComponent as Moon } from "../images/Moon.svg";
import "../styles/DarkMode.css";

const DarkMode = ({ navbarToggler, darkModeToggler }) => {
  const positionHandler = navbarToggler ? "dark_mode" : "toggled_dark_mode";

  // State variable to store the checkbox state
  const [isChecked, setIsChecked] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const selectedTheme = localStorage.getItem("selectedTheme");
    setIsLoading(false);

    if (selectedTheme === "dark") {
      setIsChecked(true);
    } else {
      setIsChecked(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (isChecked) {
        document.querySelector("body").setAttribute("data-theme", "dark");
        localStorage.setItem("selectedTheme", "dark");
      } else {
        document.querySelector("body").setAttribute("data-theme", "light");
        localStorage.setItem("selectedTheme", "light");
      }

      darkModeToggler(isChecked);
    }
  }, [isChecked, darkModeToggler, isLoading]);

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
