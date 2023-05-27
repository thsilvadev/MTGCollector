//styles
import styles from "../styles/SearchContainer.module.css";

//imports
import React, { useEffect, useState } from "react";

//imgs
import black from "../images/black.png";
import green from "../images/green.png";
import red from  "../images/red.png";
import blue from "../images/blue.png";
import white from "../images/white.png";

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

  //Debouncer
  const debounce = (func, delay) => {
    let timerId;

    return (...args) => {
      clearTimeout(timerId);

      timerId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  };

  const debouncedHandleNameChange = debounce(handleNameChange, 300);


  //Color checkbox handler

  const [blackIsChecked, setBlackIsChecked] = useState(false)
  const [greenIsChecked, setGreenIsChecked] = useState(false)
  const [redIsChecked, setRedIsChecked] = useState(false)
  const [blueIsChecked, setBlueIsChecked] = useState(false)
  const [whiteIsChecked, setWhiteIsChecked] = useState(false)

  const checkHandler = (event) => {
    if (event.target.id === "black"){
      setBlackIsChecked(!blackIsChecked)
    }
    if (event.target.id === "green"){
      setGreenIsChecked(!greenIsChecked)
    }
    if (event.target.id === "red"){
      setRedIsChecked(!redIsChecked)
    }
    if (event.target.id === "blue"){
      setBlueIsChecked(!blueIsChecked)
    }
    if (event.target.id === "white"){
      setWhiteIsChecked(!whiteIsChecked)
    }
  }

  useEffect(() => {
    console.log('black is', blackIsChecked)
  }, [blackIsChecked])

  

  

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
                <option value="&types=Battle">Battle</option>
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
                <option value="&colorIdentity=colorless">Colorless</option>
              </select>
            </div>

            <div className="col-lg-3 col-md-6 col-sm-12">
              <h4 className={styles.Filters}>Color</h4>
              <div className="row">
              <div className="col">
                <input type="checkbox" checked={blackIsChecked} onChange={checkHandler} id="black" />
                <label for="checkbox-1">
                  <img src={black} width="25" alt="black-logo" />
                </label>
              </div>

              <div className="col">
                <input type="checkbox" checked={greenIsChecked} onChange={checkHandler} id="green" />
                <label for="checkbox-2">
                  <img src={green} width="25" alt="green-logo" />
                </label>
              </div>

              <div className="col">
                <input type="checkbox" checked={redIsChecked} onChange={checkHandler} id="red" />
                <label for="checkbox-3">
                  <img src={red} width="25" alt="red-logo" />
                </label>
              </div>

              <div className="col">
                <input type="checkbox" checked={blueIsChecked} onChange={checkHandler} id="blue" />
                <label for="checkbox-4">
                  <img src={blue} width="25" alt="blue-logo" />
                </label>
              </div>

              <div className="col">
                <input type="checkbox" checked={whiteIsChecked} onChange={checkHandler} id="white" />
                <label for="checkbox-5">
                  <img src={white} width="25" alt="white-logo" />
                </label>
              </div>
              </div>
              
            </div>
          </div>
        </div>
        <div className="col mt-4 justify-content-center d-flex flex-wrap">
          <form role="search">
            <div className="row">
              <input
                className={styles.Input}
                onChange={debouncedHandleNameChange}
                type="search"
                placeholder="Type card name"
                aria-label="Search"
              />
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
