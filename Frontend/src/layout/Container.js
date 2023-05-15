//styles

    //Unfortunately here I´ll be using normal CSS and not CSS Modules because I need this .active thing to work well for now.
import 
//styles from 
'../styles/Container.css';


//routes
import AppRoutes from "../routes/index";

//hooks (for Background change on scroll)
import React, {useState, useEffect} from 'react';



const Container = () => {

    //Background change on scroll
    const [container, setContainer] = useState(false);

    const changeBackground = () => {
        console.log(window.scrollY)
        if (window.scrollY >= 80) {
            setContainer(true)
        } else {
            setContainer(false)
        }
    }

    window.addEventListener('scroll', changeBackground)


    //Return
    return (
        <div className={container ? 'Container active' : 'Container'}>
            <AppRoutes />
        </div>
    )
}

export default Container;