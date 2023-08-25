import React, { useState } from "react";

import styles from "../styles/PrevNext.module.css";

function PrevNext({ onPageChange, page, elementsArray, where, toggler }) {
  const [pageData, setPageData] = useState(page);

  //Clicking button scrolls PAGE to top
  const handleScrollToTop = () => {
    if (where === "page") {
      window.scrollTo({ top: 600, behavior: "smooth" });
      console.log("scrolling page to top");
    } else {
      console.log('still to implement scrolling to start of div')
      //toggler();
    }
  };

  //Clicking button scrolls DIV to top

  const handleIncrement = () => {
    setPageData((prevPageData) => prevPageData + 1);
    onPageChange(pageData + 1);
    handleScrollToTop();
  };

  const handleDecrement = () => {
    setPageData((prevPageData) => prevPageData - 1);
    onPageChange(pageData - 1);
    handleScrollToTop();
  };

  //Is it necessary to show the button?

  //function

  const buttonIsNeeded =
    elementsArray.length > 39 ? styles.Button : styles.Hidden;

  //Change classes based on where is being rendered

  const whereIsRendered = () => {
    if (where === "page") {
      return styles.ButtonsContainer;
    }
    if (where === "sidebar") {
      return styles.SideBar;
    }
    if (where === "collection") {
      return styles.Collection;
    }
  };

  if (page === 0) {
    return (
      <div className={whereIsRendered()}>
        <button className={buttonIsNeeded} onClick={handleIncrement}>
          Next
        </button>
      </div>
    );
  }
  if (page >= 1) {
    return (
      <div className={whereIsRendered()}>
        <div>
          <button className={styles.Button} onClick={handleDecrement}>
            &lt;&lt;
          </button>
        </div>
        <div>
          <span>{pageData + 1}</span>
        </div>
        <div>
          <button className={buttonIsNeeded} onClick={handleIncrement}>
            &gt;&gt;
          </button>
        </div>
      </div>
    );
  }
}

export default PrevNext;

PrevNext.defaultProps = {
  elementsArray: [],
  page: 0,
};
