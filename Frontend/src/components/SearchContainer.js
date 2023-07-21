//styles
import styles from "../styles/SearchContainer.module.css";

//imports
import React, { useCallback, useEffect, useState } from "react";

//imgs
import black from "../images/black.png";
import green from "../images/green.png";
import red from "../images/red.png";
import blue from "../images/blue.png";
import white from "../images/white.png";

const SearchContainer = ({ baseOfSearch, onParamsChange }) => {
  const [selectedType, setSelectedType] = useState("");

  const [selectedSet, setSelectedSet] = useState("");

  const [selectedRarity, setSelectedRarity] = useState("");

  const [selectedColor, setSelectedColor] = useState("");
  const [handledColor, setHandledColor] = useState("");
  //care for SQL Injection possibility
  const [selectedName, setSelectedName] = useState("&name=");

  //Statelifting queryParams
  let queryParams = `${selectedType}${selectedSet}${selectedRarity}${selectedColor}${selectedName}`;
  onParamsChange(queryParams);

  // Handle inputs

    //Inputs type="select"

      //Params prefixes are already written in input values so event.targer.value shall return '&set=ABC', '&type=Artifact' and so on.
  const handleTypeChange = (event) => {
    setSelectedType(event.target.value);
  };

  const handleSetChange = (event) => {
    setSelectedSet(event.target.value);
  };

  const handleRarityChange = (event) => {
    setSelectedRarity(event.target.value);
  };

    //Input type="checkbox"

      //Had to use useCallback because of useEffect array dependency issue, later in the code.
  const handleColorChange = useCallback(() => {
    debounce(setSelectedColor(handledColor), 450);
  }, [handledColor]);

    //Input type="search"
  const handleNameChange = (event) => {
    if (event.target.value) {
      setSelectedName(`&name=${event.target.value}`);
      //This means that whenever user types anything, it will search for the card in all table, unless new color check.
      setSelectedColor('');
    } else {
      setSelectedName("");
    }
  };


  //Color checkbox handler

    //Boolean variables for each color ('is the color checked or unchecked?')
  const [blackIsChecked, setBlackIsChecked] = useState(true);
  const [greenIsChecked, setGreenIsChecked] = useState(true);
  const [redIsChecked, setRedIsChecked] = useState(true);
  const [blueIsChecked, setBlueIsChecked] = useState(true);
  const [whiteIsChecked, setWhiteIsChecked] = useState(true);

    //and for extra border when selected color and typing at the same time
  const blackIsTyping = (!selectedName && blackIsChecked) ? styles.Blank : styles.Typing;
  const greenIsTyping = (!selectedName && greenIsChecked) ? styles.Blank : styles.Typing;
  const redIsTyping = (!selectedName && redIsChecked) ? styles.Blank : styles.Typing;
  const blueIsTyping = (!selectedName && blueIsChecked) ? styles.Blank : styles.Typing;
  const whiteIsTyping = (!selectedName && whiteIsChecked) ? styles.Blank : styles.Typing;

    //function that's called upon input (checking the checkboxes). It toggles the boolean variables
  const checkHandler = (event) => {

    if (event.target.id === "black") {
      setBlackIsChecked(!blackIsChecked);
    }
    if (event.target.id === "green") {
      setGreenIsChecked(!greenIsChecked);
    }
    if (event.target.id === "red") {
      setRedIsChecked(!redIsChecked);
    }
    if (event.target.id === "blue") {
      setBlueIsChecked(!blueIsChecked);
    }
    if (event.target.id === "white") {
      setWhiteIsChecked(!whiteIsChecked);
    }
  };

    //Here is the trick.

    //Had to use useCallback because of useEffect array dependency issue, later in the code.
  const colorParams = useCallback(() => {
    //1st | Create an array with the color variables.
    const colorsToCheck = [];
    colorsToCheck.push(
      blackIsChecked,
      greenIsChecked,
      redIsChecked,
      blueIsChecked,
      whiteIsChecked
    );
    
    //2nd | create this variable to add virgules if Param (letter) is not the first
    let checkedColors = 0;
    //3rd | this is the outcome Param we want, it shall start with that, it's the key. Now let's concat the value to it.
    let result = "&colorIdentity=";

    //4th Map the array and upon each iteration, check if element (color variable) is true - if true, increment checkedColors.
    colorsToCheck.map((el, index) => {
      if (el === true) {
        checkedColors++;
        //If this is the first true element, check which one it is by checking iteration index (0 is the first element => blackIsChecked; 4 is the last element => whiteIsChecked) and concatenate 'result' accordingly.
        if (checkedColors === 1) {
          if (index === 0) {
            result += "B";
          }
          if (index === 1) {
            result += "G";
          }
          if (index === 2) {
            result += "R";
          }
          if (index === 3) {
            result += "U";
          }
          if (index === 4) {
            result += "W";
          }
        }
        //If it is not the first true element, do the same but add ', ' before the corresponding letter.
        if (checkedColors > 1) {
          if (index === 0) {
            result += ", B";
          }
          if (index === 1) {
            result += ", G";
          }
          if (index === 2) {
            result += ", R";
          }
          if (index === 3) {
            result += ", U";
          }
          if (index === 4) {
            result += ", W";
          }
        }
      }
    return result;
    });

    //This was turned unecessary, as empty value '' is assumed as colorless by DB now, so we don't need to 'translate' it as before.
      
                /* 
              if (checkedColors === 0) {
                result += "colorless";
              } */ 

    return result;
  }, 
    //Dependencies Array for the useCallback() function is mandatory.
  [
    blackIsChecked,
    greenIsChecked,
    redIsChecked,
    blueIsChecked,
    whiteIsChecked
  ]);

    //this answers to handleColorChange up in the code. As there are multiple checkboxes, the query could not be updated simply by 'event.target.value' and it was necessary to build a function to workaround it (colorParams). Also, it had to be down here because of positioning (after colorParams is defined).
  useEffect(() => {
    setHandledColor(colorParams());
    handleColorChange();
    
  }, [
    blackIsChecked,
    greenIsChecked,
    redIsChecked,
    blueIsChecked,
    whiteIsChecked,
    colorParams,
    handleColorChange,
  ]);
  
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
  
    const debouncedHandleNameChange = debounce(handleNameChange, 450);


//Returns

  if (baseOfSearch === "AllCards") {
    return (
      <div className={styles.SearchContainer}>
        <h3> Filter by:</h3>
        <div className="container">
          <div className="row justify-content-around mb-2">
            <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
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
                <option value="&types=Plane">Plane</option>
              </select>
            </div>

            <div className="col-lg-4 col-md-12 col-sm-12">
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

            <div className="col-lg-4 col-md-12 col-sm-12">
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
          </div>

          <div className="row justify-content-center">
            <div className="col-12">
              <h4 className={styles.Filters}>Color</h4>
              <div className="row">
                <div className="col ps-0 pe-0">
                  <input
                    type="checkbox"
                    checked={blackIsChecked}
                    onChange={checkHandler}
                    id="black"
                  />
                  <label className={`${blackIsTyping}`} for="black">
                    <img  src={black} width="30" alt="black-logo" />
                  </label>
                </div>

                <div className="col ps-0 pe-0">
                  <input
                    type="checkbox"
                    checked={greenIsChecked}
                    onChange={checkHandler}
                    id="green"
                  />
                  <label className={`${greenIsTyping}`} for="green">
                    <img src={green} width="30" alt="green-logo" />
                  </label>
                </div>

                <div className="col ps-0 pe-0">
                  <input
                    type="checkbox"
                    checked={redIsChecked}
                    onChange={checkHandler}
                    id="red"
                  />
                  <label className={`${redIsTyping}`} for="red">
                    <img src={red} width="30" alt="red-logo" />
                  </label>
                </div>

                <div className="col ps-0 pe-0">
                  <input
                    type="checkbox"
                    checked={blueIsChecked}
                    onChange={checkHandler}
                    id="blue"
                  />
                  <label className={`${blueIsTyping}`} for="blue">
                    <img src={blue} width="30" alt="blue-logo" />
                  </label>
                </div>

                <div className="col ps-0 pe-0">
                  <input
                    type="checkbox"
                    checked={whiteIsChecked}
                    onChange={checkHandler}
                    id="white"
                  />
                  <label className={`${whiteIsTyping}`} for="white">
                    <img src={white} width="30" alt="white-logo" />
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
