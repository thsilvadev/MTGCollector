import styles from "../styles/Deck.module.css";

const Deck = ({ cardCount, colorIdentity, description, id_deck, name }) => {
  return (
    <div className="col-12 col-sm-6 col-lg-4 col-xl-3">
      <div className={styles.deckContainer}>
        <div className={styles.deck}>
          <p>Deck name:{name}</p>
          <p>Description: {description}</p>
          <p>Cards: {cardCount}</p>
          <p>Color: {colorIdentity}</p>
        </div>
      </div>
    </div>
  );
};

export default Deck;
