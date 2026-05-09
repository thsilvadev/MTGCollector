import ContactForm from "../components/ContactForm";
import { useI18n } from "../i18n/LanguageContext";

const Contact = () => {
    const { t } = useI18n();
    return (
        <div>
            <h1>{t('contact.pageTitle')}</h1>
            <ContactForm/>
        </div>
    )
}

export default Contact;