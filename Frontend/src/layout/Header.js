//styles
import styles from '../styles/Header.module.css'

//imgs
import MTG from '../images/MTGcardvault.png';

//tools
import React, { useState } from "react";

//components
import DarkMode from '../components/DarkMode';

function Header() {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleToggle = () => {
    setIsCollapsed((prevState) => !prevState);
    console.log(isCollapsed)
  };

  const [isDarkMode, setIsDarkMode] = useState(true);

  const darkModeHandler = (darkModeToggle) => {
    setIsDarkMode(darkModeToggle)
  }

  const darkNavbar = isDarkMode ? 'navbar-dark bg-dark' : 'navbar bg-light' ;

  return (
    <nav className={`navbar navbar-expand-md ${darkNavbar} ps-3 pe-3`}>
      <div className="container-fluid">
        <a className="navbar-brand" href="/">
          <span><img src={MTG} className={styles.title} width="105" alt="Logo" /></span>
        </a>
        
        <button
          className="navbar-toggler"
          type="button"
          onClick={handleToggle}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${isCollapsed ? 'hide' : 'show'}`}>
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
              <span className='nav-link'>
            <DarkMode navbarToggler={isCollapsed} darkModeToggler={darkModeHandler}/>
            </span>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Header;
