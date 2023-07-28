//styles
//import styles from '../styles/Header.module.css'

import React from 'react';

function Header() {
  return (
    <nav className="navbar navbar-expand-sm navbar-dark bg-dark ps-3 pe-3">
      <div class="container-fluid">

      <a className="navbar-brand" href="/">
        Home
      </a>
      <button
        className="navbar-toggler"
        type="button"
        data-toggle="collapse"
        data-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon"></span>
      </button>

      <div className="collapse navbar-collapse" id="navbarSupportedContent">
        <ul className="navbar-nav mr-auto">
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
        </ul>
      </div>
      </div>
    </nav>
  );
}

export default Header;