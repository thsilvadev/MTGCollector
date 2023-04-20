//styles
import styles from '../styles/SearchContainer.module.css';

const SearchContainer = () => {
    return (
    <div className={styles.SearchContainer}>
    <h3> Filter by:</h3>
    <div class="row justify-content-evenly">

      <div class="col-sm-12 col-md-4 col-lg-1">
      <h4 className={styles.Filters}>type</h4> 
        <select class="form-select" aria-label="Default select example">
          <option selected> </option>
          <option value="1">One</option>
          <option value="2">Two</option>
          <option value="3">Three</option>
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

      <div className= "col-sm-12 col-md-4 col-lg-1">
      <h4 className={styles.Filters}>rarity</h4>
        <select class="form-select" aria-label="Default select example">
          <option selected> </option>
          <option value="1">One</option>
          <option value="2">Two</option>
          <option value="3">Three</option>
        </select>
      </div>

      <div class="col-sm-12 col-md-4 col-lg-1">
      <h4 className={styles.Filters}>cost</h4>
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
    <div class="col mt-2">
      <form role="search row">
        <input class="form-control me-2 col" type="search" placeholder="Type card name here" aria-label="Search"/>
        <button class="btn btn-outline-success mt-2 col" type="submit">Search</button>
      </form>
    </div>
    </div>
        
    )
}

export default SearchContainer;