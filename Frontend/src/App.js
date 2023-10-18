//Styles
import "./App.css";
import {React, useEffect}  from "react";

//Routes
import { BrowserRouter } from "react-router-dom";

//Layout
import Header from "./layout/Header";
import Container from "./layout/Container";
import Footer from "./layout/Footer";
//Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';


//Google Analytics
import ReactGA from 'react-ga';


const TRACKING_ID = "G-7GC9T8B9ZJ"; // OUR_TRACKING_ID
ReactGA.initialize(TRACKING_ID);



function App() {

  useEffect(() => {
    ReactGA.pageview(window.location.pathname + window.location.search);
  }, []);
  
  return (
    <div className="App">
      <BrowserRouter>
        <Header />
        <Container />
        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default App;
