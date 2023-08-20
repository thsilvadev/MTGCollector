//styles
import styles from '../styles/Collection.module.css';


//Imports

import Card from "../components/Card";

import SearchContainer from "../components/SearchContainer";

import PrevNext from "../components/PrevNext";

import Axios from "axios";

import React, { useState, useEffect } from "react";



function Collection () {

    //cards
    const [cards, setCards] = useState([]);

  //page value
    const [page, setPage] = useState(0);
    
    const handlePage = (pageData) => {
    setPage(pageData);
  };

  //get Params
  const [superParams, setSuperParams] = useState("");
  const handleSuperParams = (paramsData) => {
    setSuperParams(paramsData);
    console.log(superParams);
  };

  //some refreshToggler
  const [refresherToggler, setRefresherToggler] = useState(false);
  const handleRefresherToggler = (wasToggled) => {
    setRefresherToggler(wasToggled);
  }


  //get filtered and paginated Collection Cards in real time
  useEffect(() => {
    Axios.get(`https://api.mtgchest.com/collection/${page}?${superParams}`).then(
      (response) => {
        setCards(response.data);
      }
    ).then(
      console.log(refresherToggler)
    );
  }, [page, superParams, refresherToggler]);


    return (
        <>
        <h1 className={styles.title}>Collection</h1>
        <SearchContainer
        baseOfSearch="AllCards"
        onParamsChange={handleSuperParams}
      />
      <div className="row justify-content-around">
        {cards.map((card, key) => (
          <Card
            key={key}
            id={card.id}
            multiverseId={card.multiverseId}
            scryfallId={card.scryfallId}
            name={card.name}
            types={card.types}
            keywords={card.keywords}
            table='collection'
            id_collection={card.id_collection}
            refresh={handleRefresherToggler}
          />
        ))}
      </div>
      <PrevNext onPageChange={handlePage} page={page} cardTotal={cards} where='page'/>
        </>
    )
}

export default Collection;