//styles
import styles from "../styles/Header.module.css";

//imgs
import logo2 from "../images/logo2white.png";
import logo2dark from "../images/logo2dark.png";
import loginDark from "../images/login-dark.png";
import loginWhite from "../images/login-white.png";

//tools
import React, { useEffect, useMemo, useState } from "react";
import { useAuthUser, useSignOut } from "react-auth-kit";
import { useNavigate } from "react-router-dom";

//components
import DarkMode from "../components/DarkMode";
import { useTheme } from "../hooks/useTheme";

function Header() {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const { theme, handleSetTheme } = useTheme();

  const handleToggle = () => {
    setIsCollapsed((prevState) => !prevState);
    console.log(isCollapsed);
  };
  

  // const [isDarkMode, setIsDarkMode] = useState(true);

  // const darkModeHandler = (darkModeToggle) => {
  //   setIsDarkMode(darkModeToggle);
  // };

  const { darkIcon, darkLogin } = useMemo(() => {
    console.log({theme})
    return theme === 'dark' ?
      {
        darkIcon: logo2,
        darkLogin: loginWhite,
      } : {
        darkIcon: logo2dark,
        darkLogin: loginDark
      }
  }, [theme]) 
  
  let loginClass = isCollapsed ? styles.Login : styles.toggledLogin;
  let darkNavbar = theme === "dark" ? `navbar-dark bg-${theme}` : "navbar bg-light";


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
            <button className={styles.signOut} onClick={logOut}>Log off</button>
          </span>
        </div>
      );
    }
  };

  return (
    <nav className={`navbar navbar-expand-lg ${darkNavbar} ps-3 pe-3 fixed-top`}>
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
              <a className="nav-link" id={styles.off} href="/wishlist">
                Wishlist <span className={styles.coming}>coming soon</span>
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" id={styles.off} href="/wishlist">
                AI Deck Builder <span className={styles.coming}>coming soon</span>
              </a>
            </li>
            <li className="nav-item">
              {isLoggedIn()}
            </li>
            <li className="nav-item">
              <span className="nav-link">
                <DarkMode
                  navbarToggler={isCollapsed}
                  theme={theme}
                  handleSetTheme={handleSetTheme}
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
