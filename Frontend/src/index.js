import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "react-auth-kit";

//styles
import "./index.css";

//Components
import App from "./App";

//Fonts
import "./fonts/Beleren2016-Bold.ttf";

//Bootstrap
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

//global variable declaration workaround for API Address.
window.name = "https://api.mtgchest.com";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthProvider
      authType={"cookie"}
      authName={"_auth"}
      cookieDomain={window.location.hostname}
      cookieSecure={false} //this should be turned true whenever HTTPS is implemented
    >
      <App />
    </AuthProvider>
  </React.StrictMode>
);
