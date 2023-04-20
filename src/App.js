//Styles
import "./App.css";
import React from "react";

//Routes
import { BrowserRouter } from "react-router-dom";

//Layout
import Header from "./layout/Header";
import Container from "./layout/Container";
import Footer from "./layout/Footer";

function App() {
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
