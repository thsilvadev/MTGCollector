import React, { useState, useEffect, useRef } from 'react';
import { useAuthHeader, useAuthUser } from 'react-auth-kit';
import Axios from 'axios';
import styles from '../styles/Battles.module.css';
import { useI18n } from '../i18n/LanguageContext';

// ─── Date formatting ──────────────────────────────────────────────────────────

function formatBattleDate(dateStr, lang) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;

  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = String(d.getFullYear()).slice(-2);

  const date = lang === 'pt' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
  const sep  = lang === 'pt' ? `às ${time} de ${date}` : `at ${time} on ${date}`;
  return sep;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_LABEL = {
  pending:  { pt: 'Pendente',  en: 'Pending'  },
  accepted: { pt: 'Aceita',    en: 'Accepted' },
  declined: { pt: 'Recusada',  en: 'Declined' },
};

function StatusBadge({ status, lang }) {
  const label = STATUS_LABEL[status]?.[lang] ?? status;
  return (
    <span className={`${styles.StatusBadge} ${styles[`status_${status}`]}`}>
      {label}
    </span>
  );
}

// ─── Battle row ───────────────────────────────────────────────────────────────

function BattleRow({ battle, myGameTag, lang }) {
  const {
    score_challenger, score_deck_owner,
    challenger_game_tag, deck_owner_game_tag,
    deck_name, battle_date, status,
  } = battle;

  const iAmChallenger = myGameTag && challenger_game_tag === myGameTag;

  return (
    <div className={styles.Row}>
      <div className={styles.RowMain}>
        <span className={iAmChallenger ? styles.Me : styles.Them}>
          #{challenger_game_tag}
        </span>
        <span className={styles.Score}>
          {score_challenger} – {score_deck_owner}
        </span>
        <span className={!iAmChallenger ? styles.Me : styles.Them}>
          #{deck_owner_game_tag}
        </span>
        <span className={styles.DeckSep}>:</span>
        <span className={styles.DeckName}>{deck_name}</span>
      </div>
      <div className={styles.RowMeta}>
        <span className={styles.DateStr}>{formatBattleDate(battle_date, lang)}</span>
        <StatusBadge status={status} lang={lang} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Battles() {
  const authHeader = useAuthHeader();
  const auth       = useAuthUser();
  const { t, lang } = useI18n();

  const authHeaderRef = useRef(authHeader);
  authHeaderRef.current = authHeader;

  const [battles,  setBattles]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data } = await Axios.get(
          `${window.name}/battles`,
          { headers: { Authorization: authHeaderRef.current() } }
        );
        if (!cancelled) setBattles(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const myGameTag = auth && typeof auth === 'function' ? auth()?.game_tag : null;

  return (
    <div className={styles.PageWrapper}>
      <h2 className={styles.Title}>{t('nav.battles')}</h2>

      {loading && <div className={styles.Empty}>…</div>}

      {!loading && battles.length === 0 && (
        <div className={styles.Empty}>{t('battles.empty')}</div>
      )}

      {!loading && battles.length > 0 && (
        <div className={styles.List}>
          {battles.map((b) => (
            <BattleRow
              key={b.id_battle}
              battle={b}
              myGameTag={myGameTag}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  );
}
