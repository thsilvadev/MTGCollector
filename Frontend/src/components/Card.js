//SHIT DO DO FIRST

//imports
import { React, useState } from 'react';

//styles

import styles from "../styles/Card.module.css"

function Card ({ id, types, cardname, setCode, rarity, cost, condition, multiverseId }) {

    const [battle, setBattle] = useState(false);

    const changeCardClass = () => {
        if (types === 'Battle') {
            setBattle(true)
        } else {
            setBattle(false)
        }
    }

    return (
        <div className="col-12 col-sm-6 col-lg-3">
            <img src={"https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=" + multiverseId} alt="card" className={battle ? styles.Battle : styles.Card} onMouseOver={changeCardClass} />
        </div>
    )
}

export default Card;