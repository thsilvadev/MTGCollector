import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Collection from "../pages/Collection";
import Decks from "../pages/Decks";
import Deck from "../pages/Deck";
import Wishlist from "../pages/Wishlist";
import AboutUs from "../pages/AboutUs";
import Contact from "../pages/Contact";

function AppRoutes() {
  return (
      <Routes>
        <Route path="/" exact element={<Home />} />

        <Route path="/collection" element={<Collection />} />
        <Route path="/decks" element={<Decks />} />
        <Route path="/deck/:id" element={<Deck />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
  );
}

export default AppRoutes;
