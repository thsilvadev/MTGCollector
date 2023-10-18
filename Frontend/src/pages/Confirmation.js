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
        if (response.data.error) {
          setMessage("Something went wrong");
        } else {
          alert(response.data.message);
          navigate("/login");
        }
      });
    }
  }, [emailToken]);

  return (
    <div>
      <h1>Hey!</h1>
      <h2>{message}</h2>
    </div>
  );
};

export default Confirmation;
