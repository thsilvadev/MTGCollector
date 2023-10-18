import { Routes, Route } from "react-router-dom";
//Pages that require authentication
import { RequireAuth } from "react-auth-kit";

import Home from "../pages/Home";
import Collection from "../pages/Collection";
import Decks from "../pages/Decks";
import Wishlist from "../pages/Wishlist";
import AboutUs from "../pages/AboutUs";
import Contact from "../pages/Contact";
import Login from "../pages/Login";
import Confirmation from "../pages/Confirmation";



function AppRoutes() {
  return (
    <Routes>
      <Route path="/" exact element={<Home />} />

      <Route
        path="/collection"
        element={
          <RequireAuth loginPath="/login">
            <Collection />
          </RequireAuth>
        }
      />
      <Route
        path="/decks"
        element={
          <RequireAuth loginPath="/login">
            <Decks />
          </RequireAuth>
        }
      />
      <Route
        path="/wishlist"
        element={
          <RequireAuth loginPath="/login">
            <Wishlist />
          </RequireAuth>
        }
      />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />

      <Route path="/confirmation/:emailToken" element={<Confirmation />} />
    </Routes>
  );
}

export default AppRoutes;
