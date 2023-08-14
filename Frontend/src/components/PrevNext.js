import React, { useState } from "react";

import styles from "../styles/PrevNext.module.css";


function PrevNext({ onPageChange, page, elementsArray, where }) {
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

  //Is it necessary to show the button?

    //function

  const buttonIsNeeded = elementsArray.length > 39 ? styles.Button : styles.Hidden;

  //Change classes based on where is being rendered

  const whereIsRendered = where === 'page' ? styles.ButtonsContainer : styles.SideBar ;


  if (page === 0) {
    return (
      <div className={whereIsRendered}>
        <button className={buttonIsNeeded} onClick={handleIncrement}>
          Next
        </button>
      </div>
    );
  }
  if (page >= 1) {
    return (
      <div className={whereIsRendered}>
        <div>
          <button className={styles.Button} onClick={handleDecrement}>
            &lt;&lt;
          </button>
        </div>
        <div>
          <p>{pageData + 1}</p>
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
