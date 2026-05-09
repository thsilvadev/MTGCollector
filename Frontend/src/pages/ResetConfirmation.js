import { React } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import Axios from "axios";
import * as yup from "yup";
import styles from "../styles/ForgotPassword.module.css";
import { toast } from 'react-toastify';
import { useI18n } from '../i18n/LanguageContext';

const ResetConfirmation = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const { resetToken } = useParams();

  const validationPassword = yup.object({
    password: yup
      .string()
      .min(8, t('login.passwordMin'))
      .required(t('login.passwordRequired')),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password')], t('login.passwordsMustMatch')).required(t('login.confirmPasswordReq')),
  });

  const handleSubmit = (values) => {
    if (resetToken) {
      Axios.put(`${window.name}/new-password/${resetToken}`, {
        password: values.password,
      })
        .then((response) => {
          if (response.data.message) {
            toast.success(response.data.message);
            navigate("/login");
          }
        })
        .catch((error) => {
          console.error(error);
          toast.error(error.response?.data?.error || 'An error occurred.');
        });
    }
  };

  return (
    <div
      className={styles.loginContainer}
      onLoad={window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <h1 className={styles.title}>{t('reset.title')}</h1>
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
              placeholder={t('login.passwordPlaceholder')}
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
              placeholder={t('login.confirmPlaceholder')}
              type="password"
            />

            <ErrorMessage
              component="span"
              name="confirmPassword"
              className={styles.formError}
            />
          </div>

          <button className={styles.button} type="submit">
            {t('reset.submit')}
          </button>
        </Form>
      </Formik>
    </div>
  );
};

export default ResetConfirmation;
