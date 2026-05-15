import React, { useState } from 'react';
import { useI18n } from '../i18n/LanguageContext';
import styles from '../styles/AppModal.module.css';

/**
 * AppModal — replaces window.confirm / window.prompt / alert() dialogs.
 *
 * Props:
 *   type        : 'confirm' | 'delete-qty' | 'set-qty' | 'deck-edit'
 *   title       : string (optional)
 *   message     : string
 *   maxQty      : number  (for delete-qty)
 *   cardName    : string  (for delete-qty / set-qty)
 *   deckName    : string  (for deck-edit)
 *   deckDesc    : string  (for deck-edit)
 *   confirmLabel: string  (overrides default button label, optional)
 *   onConfirm   : function(qty?) or function(name, desc) for deck-edit
 *   onCancel    : function
 */
export default function AppModal({
  type = 'confirm',
  title: titleText,
  message,
  maxQty = null,
  currentQty = 1,
  cardName,
  deckName = '',
  deckDesc = '',
  confirmLabel,
  onConfirm,
  onCancel,
}) {
  const [qty, setQty]     = useState(type === 'set-qty' ? currentQty : 1);
  const [dName, setDName] = useState(deckName);
  const [dDesc, setDDesc] = useState(deckDesc);
  const { t } = useI18n();

  const stopProp = (e) => e.stopPropagation();

  if (type === 'confirm') {
    return (
      <div className={styles.overlay} onClick={onCancel}>
        <div className={styles.box} onClick={stopProp}>
          {titleText && <h3 className={styles.title}>{titleText}</h3>}
          <p className={styles.msg}>{message}</p>
          <div className={styles.btnRow}>
            <button className={styles.cancelBtn} onClick={onCancel}>{t('modal.cancel')}</button>
            <button className={styles.confirmBtn} onClick={onConfirm}>
              {confirmLabel || t('modal.confirm')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'delete-qty') {
    const effectiveMax = maxQty ?? 1;
    const decrement = () => setQty((q) => Math.max(1, q - 1));
    const increment = () => setQty((q) => Math.min(effectiveMax, q + 1));
    const handleInput = (e) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v)) setQty(Math.min(effectiveMax, Math.max(1, v)));
    };

    return (
      <div className={styles.overlay} onClick={onCancel}>
        <div className={styles.box} onClick={stopProp}>
          <h3 className={styles.title}>{t('modal.removeTitle', { name: cardName })}</h3>
          <p className={styles.msg} style={{ marginBottom: 16 }}>
            {t('modal.howMany')}{effectiveMax > 1 ? ` ${t('modal.maxQty', { max: effectiveMax })}` : ''}
          </p>
          <div className={styles.qtyRow}>
            <button className={styles.qtyBtn} onClick={decrement} disabled={qty <= 1}>−</button>
            <input
              type="number"
              value={qty}
              min={1}
              max={effectiveMax}
              onChange={handleInput}
              className={styles.input}
              style={{ marginBottom: 0, width: 64, textAlign: 'center' }}
            />
            <button className={styles.qtyBtn} onClick={increment} disabled={qty >= maxQty}>+</button>
            <span style={{ color: '#888', fontSize: '0.85rem' }}>/ {maxQty}</span>
          </div>
          <div className={styles.btnRow}>
            <button className={styles.cancelBtn} onClick={onCancel}>{t('modal.cancel')}</button>
            <button className={styles.confirmBtn} onClick={() => onConfirm(qty)}>
              {qty === 1 ? t('modal.remove1') : t('modal.removeN', { n: qty })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'set-qty') {
    const effectiveMax = maxQty ?? 99;
    const decrement = () => setQty((q) => Math.max(0, q - 1));
    const increment = () => setQty((q) => Math.min(effectiveMax, q + 1));
    const handleInput = (e) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v)) setQty(Math.min(effectiveMax, Math.max(0, v)));
    };
    const isRemoveAll = qty === 0;

    return (
      <div className={styles.overlay} onClick={onCancel}>
        <div className={styles.box} onClick={stopProp}>
          <h3 className={styles.title}>{t('modal.setQtyTitle', { name: cardName })}</h3>
          <p className={styles.msg} style={{ marginBottom: 16 }}>{t('modal.setQtyMsg')}</p>
          <div className={styles.qtyRow}>
            <button className={styles.qtyBtn} onClick={decrement} disabled={qty <= 0}>−</button>
            <input
              type="number"
              value={qty}
              min={0}
              max={effectiveMax}
              onChange={handleInput}
              className={styles.input}
              style={{ marginBottom: 0, width: 64, textAlign: 'center' }}
            />
            <button className={styles.qtyBtn} onClick={increment} disabled={qty >= effectiveMax}>+</button>
          </div>
          {isRemoveAll && (
            <p style={{ color: '#e74c3c', fontSize: '0.85rem', margin: '-8px 0 12px' }}>
              {t('modal.setQtyRemoveAll')}
            </p>
          )}
          <div className={styles.btnRow}>
            <button className={styles.cancelBtn} onClick={onCancel}>{t('modal.cancel')}</button>
            <button
              className={styles.confirmBtn}
              style={{ background: isRemoveAll ? '#c0392b' : '#2980b9' }}
              onClick={() => onConfirm(qty)}
            >
              {isRemoveAll ? t('modal.removeAll') : t('modal.save')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'deck-edit') {
    return (
      <div className={styles.overlay} onClick={onCancel}>
        <div className={styles.box} onClick={stopProp}>
          <h3 className={styles.title}>{titleText || t('modal.editDeck')}</h3>
          <input
            className={styles.input}
            value={dName}
            onChange={(e) => setDName(e.target.value)}
            placeholder={t('modal.deckName')}
          />
          <textarea
            className={styles.textarea}
            value={dDesc}
            onChange={(e) => setDDesc(e.target.value)}
            placeholder={t('modal.deckDesc')}
          />
          <div className={styles.btnRow}>
            <button className={styles.cancelBtn} onClick={onCancel}>{t('modal.cancel')}</button>
            <button
              className={styles.confirmBtn}
              style={{ background: '#2980b9' }}
              onClick={() => onConfirm(dName, dDesc)}
            >
              {confirmLabel || t('modal.save')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
