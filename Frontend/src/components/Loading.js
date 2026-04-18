import React from "react";
import styles from "../styles/Loading.module.css";
import { ColorRing } from "react-loader-spinner";

function Loading({ page }) {
  const container = page === "AllCards" ? styles.AllCards : styles.Collection;

  return (
    <div className={container}>
      <div className={styles.loader}>
        <ColorRing
          visible={true}
          height="80"
          width="80"
          ariaLabel="color-ring-loading"
          wrapperStyle={{}}
          wrapperClass="color-ring-wrapper"
          colors={["#e15b64", "#f47e60", "#f8b26a", "#abbd81", "#849b87"]}
        />
      </div>
    </div>
  );
}

export default Loading;
