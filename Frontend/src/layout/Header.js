//styles
import styles from '../styles/Header.module.css'

import React from 'react';

function Header() {
  return (
    <nav class="navbar navbar-expand-sm navbar-light bg-light ps-3 pe-3">
      <a class="navbar-brand" href="/">
        Home
      </a>
      <button
        class="navbar-toggler"
        type="button"
        data-toggle="collapse"
        data-target="#clenavbarSupportedContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav mr-auto">
          <li class="nav-item active">
            <a class="nav-link" href="/collection">
              Collection
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/decks">
              Decks
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/wishlist">
              Wishlist
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/about">
              About Us
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/contact">
              Contact
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Header;