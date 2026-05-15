//styles
import styles from "../styles/Header.module.css";

//imgs
import logo2 from "../images/logo2white.png";
import logo2dark from "../images/logo2dark.png";
import loginDark from "../images/login-dark.png";
import loginWhite from "../images/login-white.png";

//tools
import React, { useMemo, useState } from "react";
import { useAuthUser, useSignOut } from "react-auth-kit";
import { useNavigate } from "react-router-dom";

//components
import DarkMode from "../components/DarkMode";
import { useTheme } from "../hooks/useTheme";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useI18n } from "../i18n/LanguageContext";

function Header() {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const { theme, handleSetTheme } = useTheme();
  const { t } = useI18n();

  const handleToggle = () => {
    setIsCollapsed((prevState) => !prevState);
    console.log(isCollapsed);
  };

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
  
  let darkNavbar = theme === "dark" ? "navbar-dark bg-dark" : "navbar-light bg-light";


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
        <a className={`nav-link ${styles.Login}`} href="/login">
          <img
            src={darkLogin}
            className={styles.LoginImg}
            width="40"
            alt="Logo"
          />
          {t('nav.registerOrLogin')}
        </a>
      );
    } else {
      return (
        <span className={`nav-link ${styles.Login}`}>
          <img
            src={darkLogin}
            className={styles.LoginImg}
            width="40"
            alt="Logo"
          />
          {t('nav.welcome')} {user.game_tag || user.email}!
          <button className={styles.signOut} onClick={logOut}>{t('nav.logOff')}</button>
        </span>
      );
    }
  };

  return (
    <nav className={`navbar navbar-expand-lg ${darkNavbar} ps-3 pe-3 fixed-top`}>
      <div className="container-fluid">
        <a className="navbar-brand" href="/">
          <img src={darkIcon} className={styles.title} width="40" alt="Logo" />
        </a>

        <button className="navbar-toggler" type="button" onClick={handleToggle}>
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${isCollapsed ? "hide" : "show"}`}>
          {/* Left nav links */}
          <ul className="navbar-nav me-auto align-items-lg-center">
            <li className="nav-item">
              <a className="nav-link" href="/collection">{t('nav.collection')}</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/decks">{t('nav.decks')}</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/about">{t('nav.about')}</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/contact">{t('nav.contact')}</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" id={styles.off} href="/wishlist">
                {t('nav.wishlist')} <span className={styles.coming}>{t('nav.comingSoon')}</span>
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" id={styles.off} href="/wishlist">
                {t('nav.aiDeck')} <span className={styles.coming}>{t('nav.comingSoon')}</span>
              </a>
            </li>
          </ul>

          {/* Right controls — login · dark mode · flags */}
          <div className={styles.rightControls}>
            {isLoggedIn()}
            <DarkMode
              navbarToggler={isCollapsed}
              theme={theme}
              handleSetTheme={handleSetTheme}
            />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Header;
