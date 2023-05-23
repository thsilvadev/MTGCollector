//styles
import styles from "../styles/SearchContainer.module.css";

//imports
import React, { useEffect, useState } from "react";

const SearchContainer = ({ baseOfSearch, onParamsChange }) => {
  const [selectedType, setSelectedType] = useState("");
  const [selectedSet, setSelectedSet] = useState("");
  const [selectedRarity, setSelectedRarity] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedName, setSelectedName] = useState("");

  let queryParams = `${selectedType}${selectedSet}${selectedRarity}${selectedColor}${selectedName}`;
  onParamsChange(queryParams);

  useEffect(() => {
    console.log(selectedType);
    console.log(selectedSet);
    console.log(selectedRarity);
    console.log(selectedColor);
    console.log(selectedName);
  }, [selectedType, selectedSet, selectedRarity, selectedColor, selectedName]);

  // Handle change when an Type is selected
  const handleTypeChange = (event) => {
    setSelectedType(event.target.value);
  };

  const handleSetChange = (event) => {
    setSelectedSet(event.target.value);
  };

  const handleRarityChange = (event) => {
    setSelectedRarity(event.target.value);
  };

  const handleColorChange = (event) => {
    setSelectedColor(event.target.value);
  };

  const handleNameChange = (event) => {
    if (event.target.value) {
      setSelectedName(`&name=${event.target.value}`);
    } else {
      setSelectedName("");
    }
  };

  if (baseOfSearch === "AllCards") {
    return (
      <div className={styles.SearchContainer}>
        <h3> Filter by:</h3>
        <div className="container">
          <div className="row justify-content-between">
            <div className="col-lg-3 col-md-6 col-sm-12">
              <h4 className={styles.Filters}>Type</h4>
              <select
                value={selectedType}
                className={styles.FilterBox}
                onChange={handleTypeChange}
                aria-label="Default select example"
              >
                <option selected> </option>
                <option value="&types=Creature">Creature</option>
                <option value="&types=Artifact">Artifact</option>
                <option value="&types=Land">Land</option>
                <option value="&types=Sorcery">Sorcery</option>
                <option value="&types=Enchantment">Enchantment</option>
                <option value="&types=Instant">Instant</option>
              </select>
            </div>

            <div className="col-lg-3 col-md-6 col-sm-12">
              <h4 className={styles.Filters}>Set</h4>
              <select
                value={selectedSet}
                className={styles.FilterBox}
                onChange={handleSetChange}
                aria-label="Default select example"
              >
                <option selected> </option>
                <option value="&setCode=MOM">March of the Machine</option>
                <option value="&setCode=MAT">
                  March of the Machine: The Aftermath
                </option>
                <option value="&setCode=ONE">Phyrexia: All Will Be One</option>
                <option value="&setCode=BRO">The Brothers' War</option>
                {/*have to continue... long work.*/}
              </select>
            </div>

            <div className="col-lg-3 col-md-6 col-sm-12">
              <h4 className={styles.Filters}>Rarity</h4>
              <select
                value={selectedRarity}
                className={styles.FilterBox}
                onChange={handleRarityChange}
                aria-label="Default select example"
              >
                <option selected> </option>
                <option value="&rarity=common">Common</option>
                <option value="&rarity=uncommon">Uncommon</option>
                <option value="&rarity=rare">Rare</option>
                <option value="&rarity=mythic">Mythic</option>
                <option value="&rarity=special">Special</option>
                <option value="&rarity=bonus">Bonus</option>
              </select>
            </div>

            <div className="col-lg-3 col-md-6 col-sm-12">
              <h4 className={styles.Filters}>Color</h4>
              <select
                value={selectedColor}
                className={styles.FilterBox}
                onChange={handleColorChange}
                aria-label="Default select example"
              >
                <option selected> </option>
                <option value="&colorIdentity=B">Black</option>
                <option value="&colorIdentity=R">Red</option>
                <option value="&colorIdentity=U">Blue</option>
                <option value="&colorIdentity=G">Green</option>
                <option value="&colorIdentity=W">White</option>
              </select>
            </div>
          </div>
        </div>
        <div className="col mt-4 justify-content-center d-flex flex-wrap">
          <form role="search">
            <div className="row">
              <input
                className={styles.FilterBox}
                onChange={handleNameChange}
                type="search"
                placeholder="Type card name"
                aria-label="Search"
              />
            </div>
            <div className="row">
              <button class={styles.Button} type="submit">
                Search
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  } else {
    return (
      <div className={styles.SearchContainer}>
        <h3> Filter by:</h3>
        <div class="row justify-content-evenly">
          <div class="col">
            <h4 className={styles.Filters}>type</h4>
            <select cla aria-label="Default select example">
              <option selected> </option>
              <option value="1">Creature</option>
              <option value="2">Artifact</option>
              <option value="3">Land</option>
              <option value="3">Sorcery</option>
              <option value="3">Enchantment</option>
              <option value="3">Instant</option>
            </select>
          </div>

          <div class="col-sm-12 col-md-4 col-lg-1">
            <h4 className={styles.Filters}>set</h4>
            <select cla aria-label="Default select example">
              <option selected> </option>
              <option value="1">One</option>
              <option value="2">Two</option>
              <option value="3">Three</option>
            </select>
          </div>

          <div className="col-sm-12 col-md-4 col-lg-1">
            <h4 className={styles.Filters}>rarity</h4>
            <select cla aria-label="Default select example">
              <option selected> </option>
              <option value="1">One</option>
              <option value="2">Two</option>
              <option value="3">Three</option>
            </select>
          </div>

          <div class="col-sm-12 col-md-4 col-lg-1">
            <h4 className={styles.Filters}>mana cost</h4>
            <select cla aria-label="Default select example">
              <option selected> </option>
              <option value="1">One</option>
              <option value="2">Two</option>
              <option value="3">Three</option>
            </select>
          </div>

          <div class="col-sm-12 col-md-4 col-lg-1">
            <h4 className={styles.Filters}>condition</h4>
            <select cla aria-label="Default select example">
              <option selected> </option>
              <option value="1">One</option>
              <option value="2">Two</option>
              <option value="3">Three</option>
            </select>
          </div>
        </div>
        <div class="col mt-4">
          <form role="search row">
            <input
              class="form-control me-2 col"
              type="search"
              placeholder="Type card name here"
              aria-label="Search"
            />
            <button class="btn btn-outline-success mt-4 col" type="submit">
              Search
            </button>
          </form>
        </div>
      </div>
    );
  }
};

export default SearchContainer;
