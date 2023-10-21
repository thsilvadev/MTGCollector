import { React } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import Axios from "axios";
import * as yup from "yup"; //yup needs to be imported like that or destructured for specific resources.
import styles from "../styles/ForgotPassword.module.css";

const ResetConfirmation = () => {
  const navigate = useNavigate();

  const { resetToken } = useParams();  

  const validationPassword = yup.object({
    password: yup
      .string()
      .min(8, "Password must be 8 characters minimum")
      .required("Password Required"),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password')], 'Passwords must match').required('Confirm password'),
  });

  const handleSubmit = (values) => {
    if (resetToken) {
      Axios.put(`${window.name}/new-password/${resetToken}`, {
        password: values.password,
      })
        .then((response) => {
          if (response.data.message) {
            alert(response.data.message);
            navigate("/login");
          }
        })
        .catch((error) => {
          console.error(error);
          alert(error.response.data.error);
        });
    }
  };

  return (
    <div
      className={styles.loginContainer}
      onLoad={window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <h1 className={styles.title}>Please, enter your new password:</h1>
      <Formik
        initialValues={{}}
        onSubmit={handleSubmit}
        validationSchema={validationPassword}
      >
        <Form className={styles.loginForm}>
          <div className={styles.loginFormGroup}>
            <Field
              name="password"
              className={styles.formField}
              placeholder="Password"
              type="password"
            />

            <ErrorMessage
              component="span"
              name="password"
              className={styles.formError}
              type="password"
            />
          </div>
          <div className={styles.loginFormGroup}>
            <Field
              name="confirmPassword"
              className={styles.formField}
              placeholder="Confirm Password"
              type="password"
            />

            <ErrorMessage
              component="span"
              name="confirmPassword"
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

export default ResetConfirmation;
