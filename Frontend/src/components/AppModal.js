import React, { useState } from 'react';
import { useI18n } from '../i18n/LanguageContext';

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const box = {
  background: '#1c1c1c',
  border: '1px solid #444',
  borderRadius: 12,
  padding: '28px 32px',
  minWidth: 300,
  maxWidth: 420,
  width: '90vw',
  color: '#f0f0f0',
  fontFamily: 'inherit',
  boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
};

const title = {
  margin: '0 0 12px',
  fontSize: '1.1rem',
  fontWeight: 600,
  color: '#fff',
};

const msg = {
  margin: '0 0 20px',
  fontSize: '0.95rem',
  color: '#ccc',
  lineHeight: 1.5,
};

const btnRow = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
};

const baseBtn = {
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontWeight: 500,
  transition: 'opacity 0.15s',
};

const cancelBtn = {
  ...baseBtn,
  background: '#333',
  color: '#ccc',
};

const confirmBtn = {
  ...baseBtn,
  background: '#c0392b',
  color: '#fff',
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #555',
  background: '#2a2a2a',
  color: '#f0f0f0',
  fontSize: '0.95rem',
  marginBottom: 12,
  boxSizing: 'border-box',
};

const qtyRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 20,
};

const qtyBtn = {
  ...baseBtn,
  background: '#333',
  color: '#fff',
  padding: '6px 14px',
  fontSize: '1.1rem',
};

const qtyDisplay = {
  fontSize: '1.1rem',
  fontWeight: 600,
  minWidth: 32,
  textAlign: 'center',
};

/**
 * AppModal — replaces window.confirm / window.prompt / alert() dialogs.
 *
 * Props:
 *   type        : 'confirm' | 'delete-qty' | 'deck-edit'
 *   title       : string (optional)
 *   message     : string
 *   maxQty      : number  (for delete-qty)
 *   cardName    : string  (for delete-qty)
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
  maxQty = 1,
  currentQty = 1,
  cardName,
  deckName = '',
  deckDesc = '',
  confirmLabel,
  onConfirm,
  onCancel,
}) {
  const [qty, setQty]   = useState(type === 'set-qty' ? currentQty : 1);
  const [dName, setDName] = useState(deckName);
  const [dDesc, setDDesc] = useState(deckDesc);
  const { t } = useI18n();

  const stopProp = (e) => e.stopPropagation();

  if (type === 'confirm') {
    return (
      <div style={overlay} onClick={onCancel}>
        <div style={box} onClick={stopProp}>
          {titleText && <h3 style={title}>{titleText}</h3>}
          <p style={msg}>{message}</p>
          <div style={btnRow}>
            <button style={cancelBtn} onClick={onCancel}>{t('modal.cancel')}</button>
            <button style={confirmBtn} onClick={onConfirm}>
              {confirmLabel || t('modal.confirm')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'delete-qty') {
    const decrement = () => setQty((q) => Math.max(1, q - 1));
    const increment = () => setQty((q) => Math.min(maxQty, q + 1));
    const handleInput = (e) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v)) setQty(Math.min(maxQty, Math.max(1, v)));
    };

    return (
      <div style={overlay} onClick={onCancel}>
        <div style={box} onClick={stopProp}>
          <h3 style={title}>{t('modal.removeTitle', { name: cardName })}</h3>
          <p style={{ ...msg, marginBottom: 16 }}>
            {t('modal.howMany')}{maxQty > 1 ? ` ${t('modal.maxQty', { max: maxQty })}` : ''}
          </p>
          <div style={qtyRow}>
            <button style={qtyBtn} onClick={decrement} disabled={qty <= 1}>−</button>
            <input
              type="number"
              value={qty}
              min={1}
              max={maxQty}
              onChange={handleInput}
              style={{ ...inputStyle, marginBottom: 0, width: 64, textAlign: 'center' }}
            />
            <button style={qtyBtn} onClick={increment} disabled={qty >= maxQty}>+</button>
            <span style={{ color: '#888', fontSize: '0.85rem' }}>/ {maxQty}</span>
          </div>
          <div style={btnRow}>
            <button style={cancelBtn} onClick={onCancel}>{t('modal.cancel')}</button>
            <button style={confirmBtn} onClick={() => onConfirm(qty)}>
              {qty === 1 ? t('modal.remove1') : t('modal.removeN', { n: qty })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'set-qty') {
    const decrement = () => setQty((q) => Math.max(0, q - 1));
    const increment = () => setQty((q) => Math.min(99, q + 1));
    const handleInput = (e) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v)) setQty(Math.min(99, Math.max(0, v)));
    };
    const isRemoveAll = qty === 0;

    return (
      <div style={overlay} onClick={onCancel}>
        <div style={box} onClick={stopProp}>
          <h3 style={title}>{t('modal.setQtyTitle', { name: cardName })}</h3>
          <p style={{ ...msg, marginBottom: 16 }}>{t('modal.setQtyMsg')}</p>
          <div style={qtyRow}>
            <button style={qtyBtn} onClick={decrement} disabled={qty <= 0}>−</button>
            <input
              type="number"
              value={qty}
              min={0}
              max={99}
              onChange={handleInput}
              style={{ ...inputStyle, marginBottom: 0, width: 64, textAlign: 'center' }}
            />
            <button style={qtyBtn} onClick={increment} disabled={qty >= 99}>+</button>
          </div>
          {isRemoveAll && (
            <p style={{ color: '#e74c3c', fontSize: '0.85rem', margin: '-8px 0 12px' }}>
              {t('modal.setQtyRemoveAll')}
            </p>
          )}
          <div style={btnRow}>
            <button style={cancelBtn} onClick={onCancel}>{t('modal.cancel')}</button>
            <button
              style={{ ...confirmBtn, background: isRemoveAll ? '#c0392b' : '#2980b9' }}
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
      <div style={overlay} onClick={onCancel}>
        <div style={box} onClick={stopProp}>
          <h3 style={title}>{titleText || t('modal.editDeck')}</h3>
          <input
            style={inputStyle}
            value={dName}
            onChange={(e) => setDName(e.target.value)}
            placeholder={t('modal.deckName')}
          />
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            value={dDesc}
            onChange={(e) => setDDesc(e.target.value)}
            placeholder={t('modal.deckDesc')}
          />
          <div style={btnRow}>
            <button style={cancelBtn} onClick={onCancel}>{t('modal.cancel')}</button>
            <button
              style={{ ...confirmBtn, background: '#2980b9' }}
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
