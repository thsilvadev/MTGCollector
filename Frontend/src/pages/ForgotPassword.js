import { Formik, Form, Field, ErrorMessage } from "formik";
import Axios from "axios";
import * as yup from "yup"; //yup needs to be imported like that or destructured for specific resources.
import styles from "../styles/ForgotPassword.module.css";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const handleSubmit = (values) => {
    Axios.post(`${window.name}/reset`, {
      email: values.email,
    })
      .then((response) => {
        // Check if the response contains an error property
        if (response.data.unregistered) {
          // Handle the error case
          alert(`Error: ${response.data.unregistered}`);
        } else {
          // Handle the success case
          alert(response.data.message);
          navigate("/login");
        }
      })
      .catch((error) => {
        // Handle any network or other errors
        console.error("An error occurred:", error);
        alert("An error occurred while attempting to register.");
      });
  };

  const validationEmail = yup.object({
    email: yup.string().email("Not an email").required("Email required"),
  });

  return (
    <div className={styles.loginContainer} onLoad={window.scrollTo({ top: 0, behavior: "smooth" })}>
      <h1 className={styles.title}>Please, enter your email:</h1>
      <Formik
        initialValues={{}}
        onSubmit={handleSubmit}
        validationSchema={validationEmail}
      >
        <Form className={styles.loginForm}>
          <div className={styles.loginFormGroup}>
            <Field
              name="email"
              className={styles.formField}
              placeholder="Email"
            />

            <ErrorMessage
              component="span"
              name="email"
              className={styles.formError}
            />
          </div>

          <button className={styles.button} type="submit">
            Submit
          </button>
        </Form>
      </Formik>
    </div>
  );
};

export default ForgotPassword;
