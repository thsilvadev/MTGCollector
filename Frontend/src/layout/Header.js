//styles
import styles from "../styles/Header.module.css";

//imgs
import logo2 from "../images/logo2white.png";
import logo2dark from "../images/logo2dark.png";
import loginDark from "../images/login-dark.png";
import loginWhite from "../images/login-white.png";

//tools
import React, { useState } from "react";
import { useAuthUser, useSignOut } from "react-auth-kit";
import { useNavigate } from "react-router-dom";

//components
import DarkMode from "../components/DarkMode";

function Header() {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleToggle = () => {
    setIsCollapsed((prevState) => !prevState);
    console.log(isCollapsed);
  };

  const [isDarkMode, setIsDarkMode] = useState(true);

  const darkModeHandler = (darkModeToggle) => {
    setIsDarkMode(darkModeToggle);
  };

  const darkIcon = isDarkMode ? logo2 : logo2dark;
  const darkLogin = isDarkMode ? loginWhite : loginDark;
  const loginClass = isCollapsed ? styles.Login : styles.toggledLogin;
  const darkNavbar = isDarkMode ? "navbar-dark bg-dark" : "navbar bg-light";

  const auth = useAuthUser();
  console.log("auth:", auth());

  const signOut = useSignOut();
  const navigate = useNavigate();
  const logOut = () => {
    signOut();
    navigate("/");
  };

  const isLoggedIn = () => {
    const user = auth();
  
    if (!user || !user.email) {
      return (
        <div>
          <a className={`nav-link ${loginClass}`} href="/login">
            <img
              src={darkLogin}
              className={styles.LoginImg}
              width="40"
              alt="Logo"
            />
            Register or Login
          </a>
        </div>
      );
    } else {
      return (
        <div>
          <span className={`nav-link ${loginClass}`}>
            <img
              src={darkLogin}
              className={styles.LoginImg}
              width="40"
              alt="Logo"
            />
            Welcome, {user.email}!
            <a className={styles.signOut} onClick={logOut}>Sign Out</a>
          </span>
        </div>
      );
    }
  };

  return (
    <nav className={`navbar navbar-expand-md ${darkNavbar} ps-3 pe-3`}>
      <div className="container-fluid">
        <a className="navbar-brand" href="/">
          <span>
            <img
              src={darkIcon}
              className={styles.title}
              width="40"
              alt="Logo"
            />
          </span>
        </a>

        <button className="navbar-toggler" type="button" onClick={handleToggle}>
          <span className="navbar-toggler-icon"></span>
        </button>

        <div
          className={`collapse navbar-collapse ${
            isCollapsed ? "hide" : "show"
          }`}
        >
          <ul className="navbar-nav mr-auto align-items-center">
            <li className="nav-item active">
              <a className="nav-link" href="/collection">
                Collection
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/decks">
                Decks
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/wishlist">
                Wishlist
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/about">
                About Us
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/contact">
                Contact
              </a>
            </li>
            <li className="nav-item">
              {isLoggedIn()}
            </li>
            <li className="nav-item">
              <span className="nav-link">
                <DarkMode
                  navbarToggler={isCollapsed}
                  darkModeToggler={darkModeHandler}
                />
              </span>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Header;
