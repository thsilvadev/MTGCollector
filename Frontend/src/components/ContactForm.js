import React from 'react';
import * as yup from 'yup';
import styles from '../styles/Contact.module.css';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useI18n } from '../i18n/LanguageContext';

const ContactForm = () => {

  const navigate = useNavigate();
  const { t } = useI18n();
  const [formStatus, setFormStatus] = React.useState(null);
  const onSubmit = (e) => {
    e.preventDefault()
    setFormStatus('submitting')
    const { name, email, subject, message } = e.target.elements
    let conFom = {
      yourname: name.value,
      youremail: email.value,
      yoursubject: subject.value,
      yourmessage: message.value
    }
    console.log(conFom)
    Axios.post(`${window.name}/contact`, conFom).then(() => {
      toast.success(t('contact.submitted'));
      navigate('/');
    })

  }
  return (
    <div className="container mt-5">
      <h2 className="mb-3">{t('contact.feedback')}</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label className="form-label" htmlFor="name">
            {t('contact.name')}
          </label>
          <input className="form-control" type="text" id="name" required />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="subject">
            {t('contact.subject')}
          </label>
          <input className="form-control" type="text" id="subject" required />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="email">
            {t('contact.email')}
          </label>
          <input className="form-control" type="email" id="email" required />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="message">
            {t('contact.message')}
          </label>
          <textarea maxLength='500' rows='10' className="form-control" id="message" required />
        </div>
        <button className="btn btn-danger" type="submit">
          {formStatus === 'submitting' ? t('contact.submitting') : t('contact.send')}
        </button>
      </form>
    </div>
  )
}
export default ContactForm