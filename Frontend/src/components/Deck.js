import { useState } from "react";
import Axios from "axios";
import { useAuthHeader } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import AppModal from './AppModal';
import { useI18n } from '../i18n/LanguageContext';

import styles from "../styles/Deck.module.css";

import pencil from "../images/pencil.png";

const Deck = ({
  colorIdentity,
  description,
  id_deck,
  name,
  toggler,
  cardCount,
}) => {
  const navigate = useNavigate();
  // Define the selected property (it can be null or a string)
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseEnter = (e) => {
    if (e) {
      setIsHovering(true);
    }
    console.log("is hovering: ", isHovering);
  };

  const handleMouseLeave = (e) => {
    if (e) {
      setIsHovering(false);
    }
    console.log("is hovering: ", isHovering);
  };

  const hoveringClass = isHovering ? styles.btnClose : styles.hide;

  //Headers configuration
  const authHeader = useAuthHeader();

  const config = {
    headers: {
      authorization: authHeader(),
    },
  };

  // Modal state
  const [modal, setModal] = useState(null);
  const { t } = useI18n();

  const deleteDeck = (e) => {
    e.stopPropagation();
    setModal({
      type: 'confirm',
      title: t('deck.deleteTitle'),
      message: t('deck.deleteMsg', { name }),
      confirmLabel: t('deck.deleteBtn'),
      onCancel: () => setModal(null),
      onConfirm: () => {
        setModal(null);
        Axios.delete(`${window.name}/decks/${id_deck}`, config).then(() => {
          console.log(`requested to delete ${name} from collection`);
          toggler();
        });
      },
    });
  };

  const updateDeck = (e) => {
    e.stopPropagation();
    setModal({
      type: 'deck-edit',
      title: t('deck.editTitle'),
      deckName: name,
      deckDesc: description,
      onCancel: () => setModal(null),
      onConfirm: (newName, newDesc) => {
        setModal(null);
        Axios.put(
          `${window.name}/decks/${id_deck}`,
          { name: newName, description: newDesc },
          config
        ).then(() => {
          console.log(`requested to update deck "${name}"`);
          toggler();
        }).catch((error) => {
          console.error('Update Failed:', error);
        });
      },
    });
  };

  const handleClick = () => {
    navigate(`/collection?selected=${id_deck}`);
  };

  return (
    <div className="col-12 col-sm-6 col-lg-4 col-xl-3">
      {modal && <AppModal {...modal} />}
      <div
        className={styles.deckContainer}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <button className={hoveringClass} onClick={deleteDeck}>
          &times;
        </button>
        <button
          className={` ${hoveringClass} ${styles.edit}`}
          onClick={updateDeck}
        >
          <img src={pencil} width="26px" alt="edit" />
        </button>
        <div className={styles.deck}>
          <p>{t('deck.labelName')}{name}</p>
          <p>{t('deck.labelDesc')} {description}</p>
          <p>{t('deck.labelCards')} {cardCount}</p>
          <p>{t('deck.labelColor')} {colorIdentity}</p>
        </div>
      </div>
    </div>
  );
};

export default Deck;
