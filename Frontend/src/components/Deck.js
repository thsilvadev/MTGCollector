import styles from "../styles/Deck.module.css";


const Deck = ({cardCount, colorIdentity, description, id_deck, name}) => {




    return (
        <div className={styles.deckContainer}>
            <p>Deck name:{name}</p>
            <p>Description: {description}</p>
            <p>Cards: {cardCount}</p>
            <p>Color: {colorIdentity}</p>
            
        </div>
    )

}

export default Deck;