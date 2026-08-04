//styles
import styles from "../styles/Header.module.css";

//imgs
import logo2 from "../images/logo2white.png";
import logo2dark from "../images/logo2dark.png";
import loginDark from "../images/login-dark.png";
import loginWhite from "../images/login-white.png";

//tools
import React, { useMemo, useState, useEffect } from "react";
import { useAuthUser, useSignOut, useAuthHeader } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import Axios from 'axios';

//components
import DarkMode from "../components/DarkMode";
import { useTheme } from "../hooks/useTheme";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useI18n } from "../i18n/LanguageContext";
import { toast } from 'react-toastify';

function Header() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [badgeCount, setBadgeCount] = useState(0);

  const { theme, handleSetTheme } = useTheme();
  const { t } = useI18n();
  const auth = useAuthUser();
  const authHeader = useAuthHeader();

  const handleToggle = () => {
    setIsCollapsed((prevState) => !prevState);
    console.log(isCollapsed);
  };

  // Fetch badge count once on mount when user is logged in
  useEffect(() => {
    const user = auth();
    if (!user || !user.email) return;
    Axios.get(`${window.name}/friends/badge`, {
      headers: { Authorization: authHeader() },
    })
      .then((res) => setBadgeCount(res.data.total || 0))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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


  const signOut = useSignOut();
  const navigate = useNavigate();
  const logOut = () => {
    signOut();
    navigate("/");
  };

  const copyGameTag = (tag) => {
    navigator.clipboard.writeText(tag).then(() => {
      toast.success(t('nav.gameTagCopied'));
    });
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
          {t('nav.welcome')}{' '}
          <span
            className={styles.GameTag}
            onClick={() => copyGameTag(user.game_tag || user.email)}
            title={t('nav.copyGameTag')}
          >{user.game_tag || user.email}</span>!
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
            {auth() && auth().email && (
              <li className="nav-item">
                <a className="nav-link" href="/amigos">
                  {t('nav.friends')}
                  {badgeCount > 0 && (
                    <span className={styles.Badge}>{badgeCount}</span>
                  )}
                </a>
              </li>
            )}
            {auth() && auth().email && (
              <li className="nav-item">
                <a className="nav-link" href="/meu-perfil">{t('nav.myProfile')}</a>
              </li>
            )}
            {auth() && auth().email && (
              <li className="nav-item">
                <a className="nav-link" href="/batalhas">{t('nav.battles')}</a>
              </li>
            )}
            <li className="nav-item">
              <a className="nav-link" href="/about">{t('nav.about')}</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/contact">{t('nav.contact')}</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/wishlist">
                {t('nav.wishlist')}
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
