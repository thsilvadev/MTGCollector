import { React, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Axios from 'axios';

const Confirmation = () => {
  const navigate = useNavigate();

  const { emailToken } = useParams();

  let [message, setMessage] = useState("");

  useEffect(() => {
    if (emailToken) {
      Axios.put(`${window.name}/confirmation/${emailToken}`, {
        confirmed: "confirmed",
      }).then((response) => {
        if (response.data.message){
            alert(response.data.message);
            navigate("/login");
        }
        }).catch((error) => {
            console.error(error);
            setMessage(error.response.data.error);
        })
    }
  }, [emailToken, message]);

  return (
    <div>
      <h1>Hey!</h1>
      <h2>Sorry.</h2>
      <h3>{message}</h3>
    </div>
  );
};

export default Confirmation;
