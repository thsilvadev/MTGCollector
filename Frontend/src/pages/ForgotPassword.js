import { Formik, Form, Field, ErrorMessage } from "formik";
import Axios from "axios";
import * as yup from "yup";
import styles from "../styles/ForgotPassword.module.css";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import { useI18n } from '../i18n/LanguageContext';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const validationEmail = yup.object({
    email: yup.string().email(t('login.notEmail')).required(t('login.emailRequired')),
  });

  const handleSubmit = (values) => {
    Axios.post(`${window.name}/reset`, {
      email: values.email,
    })
      .then((response) => {
        // Check if the response contains an error property
        if (response.data.unregistered) {
          // Handle the error case
          toast.error(`Error: ${response.data.unregistered}`);
        } else {
          // Handle the success case
          toast.success(response.data.message);
          navigate("/login");
        }
      })
      .catch((error) => {
        // Handle any network or other errors
        console.error("An error occurred:", error);
        toast.error("An error occurred while attempting to register.");
      });
  };

  return (
    <div className={styles.loginContainer} onLoad={window.scrollTo({ top: 0, behavior: "smooth" })}>
      <h1 className={styles.title}>{t('forgot.title')}</h1>
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
              placeholder={t('login.emailPlaceholder')}
            />

            <ErrorMessage
              component="span"
              name="email"
              className={styles.formError}
            />
          </div>

          <button className={styles.button} type="submit">
            {t('forgot.submit')}
          </button>
        </Form>
      </Formik>
    </div>
  );
};

export default ForgotPassword;
