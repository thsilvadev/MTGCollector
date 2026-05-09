import { useI18n } from "../i18n/LanguageContext";

function Wishlist () {
    const { t } = useI18n();
    return (
        <h1>{t('wishlist.title')}</h1>
    )
}

export default Wishlist;