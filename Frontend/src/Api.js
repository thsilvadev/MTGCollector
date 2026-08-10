import Axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' 
    ? window.location.origin 
    : 'http://localhost:3000'
);

const Api = Axios.create ({
    baseURL: baseURL,
})

export default Api;