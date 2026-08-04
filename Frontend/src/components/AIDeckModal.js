import React, { useState, useMemo } from 'react';
import styles from '../styles/AIDeckModal.module.css';
import { useI18n } from '../i18n/LanguageContext';

// Import color images
import black from '../images/black.png';
import green from '../images/green.png';
import red from '../images/red.png';
import blue from '../images/blue.png';
import white from '../images/white.png';

function AIDeckModal({
  isOpen,
  onClose,
  isCommanderDeck,
  lockedColors,
  onSubmit,
  isLoading,
  result,
  onApply,
}) {
  const { t } = useI18n();
  const [localColors, setLocalColors] = useState(new Set(['B', 'G', 'R', 'U', 'W']));
  const [localIsCommander, setLocalIsCommander] = useState(isCommanderDeck);

  // Initialize local colors from locked colors if deck is not empty
  useMemo(() => {
    if (lockedColors && lockedColors.size > 0) {
      setLocalColors(new Set(lockedColors));
    }
  }, [lockedColors]);

  if (!isOpen) return null;

  const handleColorToggle = (color) => {
    // Don't allow unchecking locked colors
    if (lockedColors && lockedColors.has(color)) {
      return;
    }
    const newColors = new Set(localColors);
    if (newColors.has(color)) {
      newColors.delete(color);
    } else {
      newColors.add(color);
    }
    setLocalColors(newColors);
  };

  const handleCommanderToggle = () => {
    setLocalIsCommander(!localIsCommander);
  };

  const handleBuildClick = () => {
    onSubmit({
      selectedColors: Array.from(localColors),
      isCommander: localIsCommander,
    });
  };

  const colorMap = [
    { id: 'black', color: 'B', img: black },
    { id: 'green', color: 'G', img: green },
    { id: 'red', color: 'R', img: red },
    { id: 'blue', color: 'U', img: blue },
    { id: 'white', color: 'W', img: white },
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {!result ? (
          // Config State
          <>
            <h2 className={styles.title}>{t('ai.modalTitle')}</h2>

            {/* Color Selection */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>{t('search.filterBy')} {t('search.colors')}</label>
              <div className={styles.colorRow}>
                {colorMap.map(({ id, color, img }) => {
                  const isLocked = lockedColors && lockedColors.has(color);
                  const isChecked = localColors.has(color);
                  return (
                    <div key={id} className={styles.colorItem}>
                      <input
                        type="checkbox"
                        id={`ai-color-${id}`}
                        checked={isChecked}
                        onChange={() => handleColorToggle(color)}
                        disabled={isLocked}
                        className={isLocked ? styles.lockedCheckbox : ''}
                      />
                      <label
                        htmlFor={`ai-color-${id}`}
                        className={isLocked ? styles.lockedColorLabel : styles.colorLabel}
                        title={isLocked ? `Color in current deck (locked)` : ''}
                      >
                        <img src={img} width="30" alt={`${color} color`} />
                      </label>
                    </div>
                  );
                })}
              </div>
              {lockedColors && lockedColors.size > 0 && (
                <p className={styles.lockedNote}>
                  {t('ai.lockedColorsNote') || 'Colors from your deck are locked and cannot be removed.'}
                </p>
              )}
            </div>

            {/* Commander Toggle */}
            <div className={styles.section}>
              <label className={styles.commanderToggleLabel}>
                <span className={styles.commanderToggleSwitch}>
                  <input
                    type="checkbox"
                    checked={localIsCommander}
                    onChange={handleCommanderToggle}
                  />
                  <span
                    className={
                      localIsCommander
                        ? `${styles.commanderToggleSlider} ${styles.commanderToggleSliderOn}`
                        : styles.commanderToggleSlider
                    }
                  />
                </span>
                {t('commander.toggle')}
              </label>
              <p className={styles.formatNote}>
                {localIsCommander
                  ? t('ai.commanderFormatNote') || '100 cards, 1 copy limit (except basics)'
                  : t('ai.modernFormatNote') || '60 cards, 4 copy limit (except basics)'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className={styles.buttonRow}>
              <button className={styles.cancelBtn} onClick={onClose}>
                {t('modal.cancel')}
              </button>
              <button
                className={styles.buildBtn}
                onClick={handleBuildClick}
                disabled={isLoading || localColors.size === 0}
              >
                {isLoading ? t('ai.loadingMessage') : t('ai.buildButton')}
              </button>
            </div>
          </>
        ) : (
          // Result State
          <>
            <h2 className={styles.title}>{t('ai.modalTitle')}</h2>

            {/* Selected Commander (if any) */}
            {result.selectedCommander && (
              <div className={styles.section}>
                <label className={styles.sectionLabel}>Selected Commander</label>
                <p className={styles.strategyText}>
                  {result.selectedCommander.name} ({result.selectedCommander.colorIdentity})
                </p>
              </div>
            )}

            {/* Strategy */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>{t('ai.strategyLabel')}</label>
              <p className={styles.strategyText}>{result.strategy}</p>
            </div>

            {/* Card Count */}
            <div className={styles.section}>
              <p className={styles.infoText}>
                {(result.mainboard?.length || 0) + (result.sideboard?.length || 0)} total cards
              </p>
            </div>

            {/* Action Buttons */}
            <div className={styles.buttonRow}>
              <button className={styles.cancelBtn} onClick={onClose}>
                {t('modal.cancel')}
              </button>
              <button className={styles.applyBtn} onClick={() => onApply(result)}>
                {t('ai.applyButton')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AIDeckModal;
