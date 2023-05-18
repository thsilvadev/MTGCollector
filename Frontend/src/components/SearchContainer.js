//styles
import styles from "../styles/SearchContainer.module.css";

//imports
import React, {useState} from 'react';

const SearchContainer = ({ baseOfSearch }) => {

    const [selectedOption, setSelectedOption] = useState('');
  
    // Handle change when an option is selected
    const handleOptionChange = (event) => {
      setSelectedOption(event.target.value);
      console.log(selectedOption)
    };

  if ((baseOfSearch === "AllCards")) {
    return (
      <div className={styles.SearchContainer}>
        <h3> Filter by:</h3>
        <div class="row justify-content-evenly">
          <div class="col-sm-12 col-md-4 col-lg-1">
            <h4 className={styles.Filters}>type</h4>
            <select class={selectedOption + "form-select"} onChange={handleOptionChange} aria-label="Default select example">
              <option selected> </option>
              <option value="&type=Creature">Creature</option>
              <option value="&type=Artifact">Artifact</option>
              <option value="&type=Land">Land</option>
              <option value="&type=Sorcery">Sorcery</option>
              <option value="&type=Enchantment">Enchantment</option>
              <option value="&type=Instant">Instant</option>
            </select>
          </div>

          <div class="col-sm-12 col-md-4 col-lg-1">
            <h4 className={styles.Filters}>set</h4>
            <select class="form-select" aria-label="Default select example">
              <option selected> </option>
              <option value="&setCode=MOM">March of the Machine</option>
              <option value="&setCode=MAT">March of the Machine: The Aftermath</option>
              <option value="&setCode=ONE">Phyrexia: All Will Be One</option>
              <option value="&setCode=BRO">The Brothers' War</option>
              {/*have to continue... long work.*/}

            </select>
          </div>

          <div className="col-sm-12 col-md-4 col-lg-1">
            <h4 className={styles.Filters}>rarity</h4>
            <select class="form-select" aria-label="Default select example">
              <option selected> </option>
              <option value="1">One</option>
              <option value="2">Two</option>
              <option value="3">Three</option>
            </select>
          </div>

          <div class="col-sm-12 col-md-4 col-lg-1">
            <h4 className={styles.Filters}>mana cost</h4>
            <select class="form-select" aria-label="Default select example">
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
  } else {
    return (
      <div className={styles.SearchContainer}>
        <h3> Filter by:</h3>
        <div class="row justify-content-evenly">
          <div class="col-sm-12 col-md-4 col-lg-1">
            <h4 className={styles.Filters}>type</h4>
            <select class="form-select" aria-label="Default select example">
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
            <select class="form-select" aria-label="Default select example">
              <option selected> </option>
              <option value="1">One</option>
              <option value="2">Two</option>
              <option value="3">Three</option>
            </select>
          </div>

          <div className="col-sm-12 col-md-4 col-lg-1">
            <h4 className={styles.Filters}>rarity</h4>
            <select class="form-select" aria-label="Default select example">
              <option selected> </option>
              <option value="1">One</option>
              <option value="2">Two</option>
              <option value="3">Three</option>
            </select>
          </div>

          <div class="col-sm-12 col-md-4 col-lg-1">
            <h4 className={styles.Filters}>mana cost</h4>
            <select class="form-select" aria-label="Default select example">
              <option selected> </option>
              <option value="1">One</option>
              <option value="2">Two</option>
              <option value="3">Three</option>
            </select>
          </div>

          <div class="col-sm-12 col-md-4 col-lg-1">
            <h4 className={styles.Filters}>condition</h4>
            <select class="form-select" aria-label="Default select example">
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
