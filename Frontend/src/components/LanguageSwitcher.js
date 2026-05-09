import React from 'react';
import { useI18n } from '../i18n/LanguageContext';

const btn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '22px',
  lineHeight: 1,
  padding: '2px 3px',
  borderRadius: 4,
  opacity: 0.55,
  transition: 'opacity 0.15s, transform 0.15s',
};

const btnActive = {
  ...btn,
  opacity: 1,
  transform: 'scale(1.2)',
};

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
      title="Language / Idioma"
    >
      <button
        style={lang === 'en' ? btnActive : btn}
        onClick={() => setLang('en')}
        aria-label="English"
        title="English"
      >
        🇺🇸
      </button>
      <button
        style={lang === 'pt' ? btnActive : btn}
        onClick={() => setLang('pt')}
        aria-label="Português"
        title="Português"
      >
        🇧🇷
      </button>
    </div>
  );
}
