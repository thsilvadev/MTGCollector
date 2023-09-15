import { Formik, Form, Field, ErrorMessage } from "formik";
import * as yup from "yup"; //yup needs to be imported like that or destructured for specific resources.
import Axios from "axios";

//styles
import styles from "../styles/Login.module.css";

function Login() {
  const handleClickLogin = (values) => {
    Axios.post(`${window.name}/login`, {
        email: values.email,
        password: values.password
    }).then((response) => {
        // Check if the response contains an error property
        if (response.data.error) {
          // Handle the error case
          alert(`Error: ${response.data.error}`);
        } else {
          // Handle the success case
          alert(response.data.message);
        }
      })
      .catch((error) => {
        // Handle any network or other errors
        console.error("An error occurred:", error);
        alert("An error occurred while registering.");
      });
  };

  const handleClickRegister = (values) => {
    Axios.post(`${window.name}/register`, {
        email: values.email,
        password: values.password,
    }).then((response) => {
        // Check if the response contains an error property
        if (response.data.error) {
          // Handle the error case
          alert(`Error: ${response.data.error}`);
        } else {
          // Handle the success case
          alert(response.data.message);
        }
      })
      .catch((error) => {
        // Handle any network or other errors
        console.error("An error occurred:", error);
        alert("An error occurred while attempting to log in.");
      });
  };

  const validationLogin = yup.object({
    email: yup.string().email("Not an email").required("Email Required"),
    password: yup
      .string()
      .min(8, "Password must be 8 characters minimum")
      .required("Password Required"),
  });

  const validationRegister = yup.object({
    email: yup.string().email("Not an email").required("Email Required"),
    password: yup
      .string()
      .min(8, "Password must be 8 characters minimum")
      .required("Password Required"),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password')], 'Passwords must match').required('Confirm password'),
  });

  return (
    <div className={styles.loginContainer}>
      <h1>Login</h1>
      <Formik
        initialValues={{}}
        onSubmit={handleClickLogin}
        validationSchema={validationLogin}
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
          <div className={styles.loginFormGroup}>
            <Field
              name="password"
              className={styles.formField}
              placeholder="Password"
            />

            <ErrorMessage
              component="span"
              name="password"
              className={styles.formError}
            />
          </div>
          <button className={styles.button} type="submit">
            Login
          </button>
        </Form>
      </Formik>
      <h2>Register</h2>
      <Formik
        initialValues={{}}
        onSubmit={handleClickRegister}
        validationSchema={validationRegister}
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
          <div className={styles.loginFormGroup}>
            <Field
              name="password"
              className={styles.formField}
              placeholder="Password"
            />

            <ErrorMessage
              component="span"
              name="password"
              className={styles.formError}
            />
          </div>
          <div className={styles.loginFormGroup}>
            <Field
              name="confirmPassword"
              className={styles.formField}
              placeholder="Confirm Password"
            />

            <ErrorMessage
              component="span"
              name="confirmPassword"
              className={styles.formError}
            />
          </div>
          <button className={styles.button} type="submit">
            Sign up
          </button>
        </Form>
      </Formik>
    </div>
  );
}

export default Login;
