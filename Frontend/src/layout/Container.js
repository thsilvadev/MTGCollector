//styles

    //Unfortunately here I´ll be using normal CSS and not CSS Modules because I need this .active thing to work well for now.
import 
//styles from 
'../styles/Container.css';


//routes
import AppRoutes from "../routes/index";

//hooks (for Background change on scroll)
import React, {useState, useEffect} from 'react';

//images
//import background from '../images/bg.jpg'



const Container = () => {

    //Background change on scroll
    const [container, setContainer] = useState(false);

    const changeBackground = () => {
        if (window.scrollY >= 600) {
            setContainer(true)
        } else {
            setContainer(false)
        }
    }

    //Event Listener
    useEffect(() => {
        window.addEventListener('scroll', changeBackground);
        return () => {
            window.removeEventListener('scroll', changeBackground)

        }
    }, [])


    //Return
    return (
        <div className={`Container ${container ? 'active' : ''}`} /* style={{backgroundImage: `url(${background})`}}*/ >
            <AppRoutes />
        </div>
    )
}

export default Container; 