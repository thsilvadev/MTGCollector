//styles
import styles from '../styles/Home.module.css'

import SearchContainer from '../components/SearchContainer'

function Home() {
  return (
    <>
      
      <h2 className={styles.title}> Welcome to MTGCollector!</h2>
      <h3> What is it for?</h3>
      <p className={styles.Paragraph}> MTGCollector is the perfect solution for organizing you're <i>Magic: The Gathering</i> cards! Here you'll be able to:</p>
      <ul className={styles.list}>
        <li>
          Mirror your physical cards by adding cards to your collection.
        </li>
        <li>
          Build multiple decks with the same cards that you have so you don't need to take notes on shared cards
        </li>

        <li>
          Fill your wishlist and write a description on each card to remember their role in your malevolent strategies in  assigned deck
        </li>

        <li>
          ... and much more! All this with actual 3rd millenium user interface!
        </li>
      </ul>

      <button>Create Collection!</button>
      
      <h1>All Magic Cards</h1>
      <SearchContainer />
    </>
  );
}

export default Home;
