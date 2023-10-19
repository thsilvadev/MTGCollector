import { Formik, Form, Field, ErrorMessage } from "formik";
import * as yup from "yup"; //yup needs to be imported like that or destructured for specific resources.
import Axios from "axios";
import { useNavigate } from 'react-router-dom';
import { useSignIn } from "react-auth-kit";

//styles
import styles from "../styles/Login.module.css";

function Login() {
  const navigate = useNavigate();
  const signIn = useSignIn();

  

  const handleClickLogin = (values) => {
    Axios.post(`${window.name}/login`, {
        email: values.email,
        password: values.password
    }).then((response) => {
        // Check if the response contains an error property
        if (response.data.error) {
          // Handle the error case
          alert(`${response.data.error}`);
        } else {
          // Handle the success case
          alert(response.data.message);
          
          //get Json Web Token and store it
          signIn({
            token: response.data.token,
            expiresIn: 3600,
            tokenType: "Bearer",
            authState: { email: values.email },
          })
          navigate('/collection');
        }
      })
      .catch((error) => {
        // Handle any network or other errors
        console.error("An error occurred:", error);
        alert("An error occurred while attempting to login.");
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
          alert(response.data.confirm);
        }
      })
      .catch((error) => {
        // Handle any network or other errors
        console.error("An error occurred:", error);
        alert("An error occurred while attempting to register.");
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
    <div className={styles.loginContainer} onLoad={window.scrollTo({ top: 0, behavior: "smooth" })}>
      <h1 className={styles.title}>Login</h1>
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
              type="password"
            />

            <ErrorMessage
              component="span"
              name="password"
              className={styles.formError}
              type="password"
            />
          </div>
          <button className={styles.button} type="submit">
            Login
          </button>
        </Form>
      </Formik>
      <h2 className={styles.title}>Register</h2>
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
              type="password"
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
              type="password"
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
