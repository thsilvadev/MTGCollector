import { useState } from "react";
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
  const [resendEmail, setResendEmail] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const handleResendConfirmation = async (e) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResendLoading(true);
    setResendMsg('');
    try {
      const response = await Axios.post(`${window.name}/resend-confirmation`, { email: resendEmail });
      setResendMsg(response.data.message || response.data.error);
    } catch (err) {
      setResendMsg(err.response?.data?.error || 'An error occurred.');
    } finally {
      setResendLoading(false);
    }
  };

  

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
            <br/>
            <a className={styles.Forgot} href="/forgot">Forgot your password?</a>
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
      <h2 className={styles.title}>Resend confirmation</h2>
      <form className={styles.loginForm} onSubmit={handleResendConfirmation}>
        <div className={styles.loginFormGroup}>
          <input
            className={styles.formField}
            type="email"
            placeholder="Your registered email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            required
          />
        </div>
        {resendMsg && <span className={styles.formError}>{resendMsg}</span>}
        <button className={styles.button} type="submit" disabled={resendLoading}>
          {resendLoading ? 'Sending...' : 'Resend confirmation email'}
        </button>
      </form>
    </div>
  );
}

export default Login;
