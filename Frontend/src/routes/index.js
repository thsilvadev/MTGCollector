import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Collection from "../pages/Collection";
import Decks from "../pages/Decks";
import Wishlist from "../pages/Wishlist";
import AboutUs from "../pages/AboutUs";
import Contact from "../pages/Contact";
import Login from "../pages/Login";

function AppRoutes() {
  return (
      <Routes>
        <Route path="/" exact element={<Home />} />

        <Route path="/collection" element={<Collection />} />
        <Route path="/decks" element={<Decks />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
      </Routes>
  );
}

export default AppRoutes;
