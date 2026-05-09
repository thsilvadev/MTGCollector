import img1 from '../imgs/img1.jpg'

//styles
import styles from '../styles/AboutUs.module.css'
import { useI18n } from '../i18n/LanguageContext';


const AboutUs = () => {
    const { t } = useI18n();
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{t('about.title')}</h1>
            <div>
                <img src={img1} className={styles.image1} alt="something"/>
            </div>
            <div className={styles.text}>
            <p>{t('about.p1')}</p> <br/>
            <p>{t('about.p2')}</p>
            <p>{t('about.p3pre')} <a href="/contact">{t('about.here')}</a>{t('about.p3pos')}</p>
            </div>
        </div>
        
    )
}


export default AboutUs;