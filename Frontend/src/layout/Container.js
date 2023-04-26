//styles
import styles from '../styles/Container.module.css';


//routes
import AppRoutes from "../routes/index";

const Container = () => {
    return (
        <div className={styles.Container}>
            <AppRoutes />
        </div>
    )
}

export default Container;