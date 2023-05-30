//SHIT DO DO FIRST

//imports
import { React, useState } from 'react';

//styles

import styles from "../styles/Card.module.css"

function Card ({ id, types, name, setCode, rarity, cost, condition, multiverseId, keywords}) {

    //Conditional CSS classes for exotic type cards

    const [battle, setBattle] = useState(false);
    const [plane, setPlane] = useState(false);

    const isBattle = battle ? styles.Battle : styles.Card;
    const isPlane = plane ? styles.Plane : styles.Card;

    const changeCardClass = () => {
        if (types === 'Battle' || keywords === 'Fuse') {
            setBattle(true)
        } else {
            setBattle(false)
        }
        if (types === 'Plane') {
            setPlane(true)
        } else {
            setPlane(false)
        } //Fuse cards act just like Battle cards so it's using the same class.
    }

    return (
        <div className="col-12 col-sm-6 col-lg-3">
            <img src={"https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=" + multiverseId} alt="card" className={`${isBattle} ${isPlane}`} onLoad={changeCardClass}/>
        </div>
    )
}

export default Card;