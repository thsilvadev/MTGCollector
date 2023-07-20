import React, { useState } from "react";

import styles from "../styles/PrevNext.module.css";


function PrevNext({ onPageChange, page, cardTotal }) {
  const [pageData, setPageData] = useState(page);

  const handleScrollToTop = () => {
    window.scrollTo({top: 600, behavior: 'smooth'});
  };

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

  onPageChange(pageData);

  //Is it necessary to show the button?

    //function

  const buttonIsNeeded = cardTotal.length > 39 ? styles.Button : styles.Hidden;


  if (page === 0) {
    return (
      <div className={styles.ButtonsContainer}>
        <button className={buttonIsNeeded} onClick={handleIncrement}>
          Next
        </button>
      </div>
    );
  }
  if (page >= 1) {
    return (
      <div className={styles.ButtonsContainer}>
        <div>
          <button className={styles.Button} onClick={handleDecrement}>
            Previous
          </button>
        </div>
        <div>
          <p>{pageData + 1}</p>
        </div>
        <div>
          <button className={buttonIsNeeded} onClick={handleIncrement}>
            Next
          </button>
        </div>
      </div>
    );
  }
}

export default PrevNext;
