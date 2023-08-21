import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

//Fonts
import './fonts/Beleren2016-Bold.ttf';

//Bootstrap
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

//global variable declaration workaround for API Address.
window.name = 'http://api.mtgchest.com';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


