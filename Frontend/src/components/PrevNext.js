import React, { useState } from "react";

import styles from '../styles/PrevNext.module.css'

function PrevNext({ onPageChange, page }) {
  const [pageData, setPageData] = useState(0);

  const handleIncrement = () => {
    setPageData((prevPageData) => prevPageData + 1);
    onPageChange(pageData + 1);
  };

  const handleDecrement = () => {
    setPageData((prevPageData) => prevPageData - 1);
    onPageChange(pageData - 1);
  };

  onPageChange(pageData);

  if (page === 0) {
    return <button className={styles.Button} onClick={handleIncrement}>Próxima</button>;
  }
  if (page >= 1) {
    return (
      <div className={styles.ButtonsContainer}>
        <div >
          <button className={styles.Button} onClick={handleDecrement}>Anterior</button>
        </div>
        <div>
          <p>{pageData}</p>
        </div>
        <div >
          <button className={styles.Button} onClick={handleIncrement}>Próxima</button>
        </div>
      </div>
    );
  }
}

export default PrevNext;
