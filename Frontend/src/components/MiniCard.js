//Styles
import styles from '../styles/MiniCard.module.css'

//Tools
import Axios from 'axios';

const MiniCard = ({
    id,
    name,
    table,
    cost,
    id_collection,
    id_constructed,
    isModalOpen,
    count,
    toggle
}) => {


    //Delete
  //Delete from Collection
  const deleteFromCollection = () => {
    if (
      window.confirm(`You're deleting ${name} from your collection. Confirm?`)
    ) {
      Axios.delete(`http://192.168.0.82:3344/card/${id_collection}`).then(
        console.log(`${name} deleted from collection`)
      );
      toggle();
    }
  };

  //name sanitization (to deal with Transform cards that has two names)

  function removeAfterDoubleSlash(cardName) {
    const doubleSlashIndex = cardName.indexOf('//');
    
    if (doubleSlashIndex !== -1) {
      // If '//' is found, remove the portion of the string after it
      return cardName.slice(0, doubleSlashIndex).trim();
    } else {
      // If '//' is not found, return the original string
      return cardName;
    }
  }

  const cardName = removeAfterDoubleSlash(name);


//Render

if (isModalOpen){
    if (table === 'collection') {
        return (
            <div className={styles.MiniCard} onClick={deleteFromCollection} draggable={true}>
                <p>{count}x)</p>
                  <p>{cardName}</p>    
                  <p>{cost}</p>
            </div>
        )
        } else if (table === 'deck') {
            <span></span>
        }
}

}

export default MiniCard;