import React from 'react';
import * as yup from 'yup';
import styles from '../styles/Contact.module.css';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ContactForm = () => {

  const navigate = useNavigate();
  const [formStatus, setFormStatus] = React.useState('Send')
  const onSubmit = (e) => {
    e.preventDefault()
    setFormStatus('Submitting...')
    const { name, email, subject, message } = e.target.elements
    let conFom = {
      yourname: name.value,
      youremail: email.value,
      yoursubject: subject.value,
      yourmessage: message.value
    }
    console.log(conFom)
    Axios.post(`${window.name}/contact`, conFom).then(() => {
      alert('Contact submitted. Thanks for your feedback!');
      navigate('/');
    })

  }
  return (
    <div className="container mt-5">
      <h2 className="mb-3">Please, any feedback is much appreciated!</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label className="form-label" htmlFor="name">
            Name
          </label>
          <input className="form-control" type="text" id="name" required />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="subject">
            Subject
          </label>
          <input className="form-control" type="text" id="subject" required />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input className="form-control" type="email" id="email" required />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="message">
            Message
          </label>
          <textarea maxLength='500' rows='10' className="form-control" id="message" required />
        </div>
        <button className="btn btn-danger" type="submit">
          {formStatus}
        </button>
      </form>
    </div>
  )
}
export default ContactForm