//SHIT DO DO FIRST

//styles

import styles from "../styles/Card.module.css"

function Card ({ id, type, cardname, setCode, rarity, cost, condition, multiverseId }) {
    return (
        <div className="col-12 col-sm-6 col-lg-3">
            <img src={"https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=" + multiverseId} alt="card" className={styles.CardContainer}/>
        </div>
    )
}

export default Card;