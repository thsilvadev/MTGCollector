import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthHeader, useAuthUser } from 'react-auth-kit';
import Axios from 'axios';
import { toast } from 'react-toastify';
import styles from '../styles/ProfilePage.module.css';
import { useI18n } from '../i18n/LanguageContext';

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  '#7986CB', '#4DB6AC', '#FFB74D', '#F06292',
  '#AED581', '#4FC3F7', '#FF8A65', '#BA68C8',
];

function colorFromName(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Battle Modal ─────────────────────────────────────────────────────────────

function BattleModal({ deck, onClose, onSend, t }) {
  const [battleDate, setBattleDate] = useState('');
  const [scoreYou, setScoreYou]     = useState('');
  const [scoreThem, setScoreThem]   = useState('');
  const [loading, setLoading]       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const sy = Number(scoreYou);
    const st = Number(scoreThem);
    if (isNaN(sy) || isNaN(st) || sy < 0 || st < 0) {
      toast.error(t('battle.errorScore'));
      return;
    }
    setLoading(true);
    await onSend({ deck_id: deck.id_deck, battle_date: battleDate, score_challenger: sy, score_deck_owner: st });
    setLoading(false);
  }

  return (
    <div className={styles.ModalOverlay} onClick={onClose}>
      <div className={styles.ModalBox} onClick={(e) => e.stopPropagation()}>
        <p className={styles.ModalTitle}>{t('battle.declare')} — {deck.name}</p>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className={styles.ModalField}>
            <label className={styles.ModalLabel}>{t('battle.date')}</label>
            <input
              type="datetime-local"
              className={styles.ModalInput}
              value={battleDate}
              onChange={(e) => setBattleDate(e.target.value)}
              required
            />
          </div>

          <div className={styles.ModalRow}>
            <div className={styles.ModalField}>
              <label className={styles.ModalLabel}>{t('battle.scoreYou')}</label>
              <input
                type="number"
                min="0"
                className={styles.ModalInput}
                value={scoreYou}
                onChange={(e) => setScoreYou(e.target.value)}
                required
              />
            </div>
            <div className={styles.ModalField}>
              <label className={styles.ModalLabel}>{t('battle.scoreThem')}</label>
              <input
                type="number"
                min="0"
                className={styles.ModalInput}
                value={scoreThem}
                onChange={(e) => setScoreThem(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.ModalActions}>
            <button type="button" className={styles.ModalCancelBtn} onClick={onClose}>
              {t('battle.cancel')}
            </button>
            <button type="submit" className={styles.ModalSendBtn} disabled={loading}>
              {loading ? '…' : t('battle.send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── See-All Testimonials Modal ───────────────────────────────────────────────

function AllTestimonialsModal({ userId, authHeaderRef, t, onClose }) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data } = await Axios.get(
          `${window.name}/profile/${userId}/testimonials?limit=50&offset=0`,
          { headers: { Authorization: authHeaderRef.current() } }
        );
        if (!cancelled) setItems(data.testimonials || []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId, authHeaderRef]);

  return (
    <div className={styles.ModalOverlay} onClick={onClose}>
      <div className={styles.ModalBox} onClick={(e) => e.stopPropagation()}>
        <p className={styles.ModalTitle}>{t('profile.seeAllTitle')}</p>
        <div className={styles.AllTestimonialsBody}>
          {loading && <div className={styles.Empty}>…</div>}
          {!loading && items.length === 0 && (
            <div className={styles.Empty}>{t('profile.noTestimonials')}</div>
          )}
          {items.map((item) => (
            <div key={item.id_testimonial} className={styles.TestimonialItem}>
              <div className={styles.TestimonialMeta}>
                <strong>{item.authorGameTag || item.authorName}</strong>
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
              <div className={styles.TestimonialText}>{item.text}</div>
            </div>
          ))}
        </div>
        <div className={styles.ModalActions}>
          <button className={styles.ModalCancelBtn} onClick={onClose}>{t('battle.cancel')}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export default function ProfilePage({ isSelf = false }) {
  const { id: paramId } = useParams();
  const authHeader = useAuthHeader();
  const auth       = useAuthUser();
  const { t }      = useI18n();

  // Stable refs so effects don't re-run when auth hooks return new refs
  const authHeaderRef = useRef(authHeader);
  authHeaderRef.current = authHeader;

  const [profile,      setProfile]      = useState(null);
  const [decks,        setDecks]        = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [totalT,       setTotalT]       = useState(0);
  const [decksError,   setDecksError]   = useState(null);  // 'notFriend' | null
  const [loading,      setLoading]      = useState(true);

  // Battle modal
  const [battleDeck,   setBattleDeck]   = useState(null);

  // See-all modal
  const [showAllT,     setShowAllT]     = useState(false);

  // Testimonial form
  const [tText,        setTText]        = useState('');
  const [tLoading,     setTLoading]     = useState(false);

  // Resolve which userId to use
  const userId = isSelf ? 'me' : paramId;

  // ─── Fetch profile + decks + testimonials ──────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const profileUrl = `${window.name}/profile/${userId}`;
      const [profileRes, decksRes, testimonialsRes] = await Promise.allSettled([
        Axios.get(profileUrl, { headers: { Authorization: authHeaderRef.current() } }),
        Axios.get(`${profileUrl}/decks`, { headers: { Authorization: authHeaderRef.current() } }),
        Axios.get(`${profileUrl}/testimonials?limit=3&offset=0`, { headers: { Authorization: authHeaderRef.current() } }),
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data);
      }

      if (decksRes.status === 'fulfilled') {
        setDecks(decksRes.value.data);
        setDecksError(null);
      } else {
        const status = decksRes.reason?.response?.status;
        setDecks([]);
        setDecksError(status === 403 ? 'notFriend' : 'error');
      }

      if (testimonialsRes.status === 'fulfilled') {
        setTestimonials(testimonialsRes.value.data.testimonials || []);
        setTotalT(testimonialsRes.value.data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ─── Declare battle ────────────────────────────────────────────────────────

  async function handleDeclareBattle({ deck_id, battle_date, score_challenger, score_deck_owner }) {
    try {
      await Axios.post(
        `${window.name}/battles`,
        { deck_id, battle_date, score_challenger, score_deck_owner },
        { headers: { Authorization: authHeaderRef.current() } }
      );
      toast.success(t('battle.sent'));
      setBattleDeck(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  }

  // ─── Submit testimonial ────────────────────────────────────────────────────

  async function handlePublishTestimonial(e) {
    e.preventDefault();
    if (!tText.trim()) return;
    setTLoading(true);
    try {
      const targetId = profile?.id_user;
      await Axios.post(
        `${window.name}/profile/${targetId}/testimonials`,
        { text: tText.trim() },
        { headers: { Authorization: authHeaderRef.current() } }
      );
      setTText('');
      toast.success('Depoimento publicado!');
      // Reload testimonials
      const { data } = await Axios.get(
        `${window.name}/profile/${targetId}/testimonials?limit=3&offset=0`,
        { headers: { Authorization: authHeaderRef.current() } }
      );
      setTestimonials(data.testimonials || []);
      setTotalT(data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setTLoading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className={styles.LoadingWrapper}>…</div>;
  }

  if (!profile) {
    return <div className={styles.LoadingWrapper}>404</div>;
  }

  const name      = profile.name || profile.game_tag || '?';
  const gameTag   = profile.game_tag || '';
  const badges    = profile.badges || [];
  const unlockedB = badges.filter((b) => !b.locked);

  // Is the current viewer the same user as the profile?
  const viewerAuth  = auth && typeof auth === 'function' ? auth() : null;
  const isOwnProfile = isSelf || (viewerAuth && profile.id_user && String(viewerAuth.id) === String(profile.id_user));

  return (
    <div className={styles.PageWrapper}>
      {/* ── Hero ── */}
      <div className={styles.Hero}>
        <div className={styles.HeroRow}>
          <div
            className={styles.Avatar}
            style={{ background: colorFromName(name) }}
          >
            {getInitials(name)}
          </div>
          <div className={styles.HeroInfo}>
            <span className={styles.HeroName}>{name}</span>
            {gameTag && <span className={styles.HeroGameTag}>#{gameTag}</span>}
          </div>
        </div>

        {/* Badge row */}
        {badges.length > 0 && (
          <div className={styles.BadgesRow}>
            {badges.map((badge) => (
              <span
                key={badge.id}
                className={`${styles.Badge} ${badge.locked ? styles.locked : styles.unlocked}`}
                title={badge.description}
              >
                <span className={styles.BadgeIcon}>{badge.icon}</span>
                {t(`profile.badge.${badge.id}`) || badge.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className={styles.Content}>
        {/* ── Decks ── */}
        <div className={styles.Section}>
          <div className={styles.SectionHeader}>{t('profile.decks')}</div>
          <div className={styles.SectionBody}>
            {decksError === 'notFriend' ? (
              <div className={styles.NotFriend}>{t('profile.notFriend')}</div>
            ) : decks.length === 0 ? (
              <div className={styles.Empty}>{t('profile.noDecks')}</div>
            ) : (
              decks.map((deck) => (
                <div key={deck.id_deck} className={styles.DeckItem}>
                  <div>
                    <div className={styles.DeckName}>{deck.name}</div>
                    <div className={styles.DeckMeta}>
                      {deck.format && <span>{deck.format}</span>}
                      {deck.card_count != null && <span>{deck.card_count} cards</span>}
                    </div>
                  </div>
                  {!isOwnProfile && (
                    <button
                      className={styles.BattleBtn}
                      onClick={() => setBattleDeck(deck)}
                    >
                      {t('battle.declare')}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Testimonials ── */}
        <div className={styles.Section}>
          <div className={styles.SectionHeader}>{t('profile.testimonials')}</div>
          <div className={styles.SectionBody}>
            {testimonials.length === 0 ? (
              <div className={styles.Empty}>{t('profile.noTestimonials')}</div>
            ) : (
              testimonials.map((item) => (
                <div key={item.id_testimonial} className={styles.TestimonialItem}>
                  <div className={styles.TestimonialMeta}>
                    <strong>{item.authorGameTag || item.authorName}</strong>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.TestimonialText}>{item.text}</div>
                </div>
              ))
            )}

            {totalT > 3 && (
              <button className={styles.SeeAllBtn} onClick={() => setShowAllT(true)}>
                {t('profile.seeAll').replace('{n}', totalT)}
              </button>
            )}

            {/* Write testimonial (only when viewing someone else) */}
            {!isOwnProfile && (
              <form onSubmit={handlePublishTestimonial} className={styles.TestimonialForm}>
                <textarea
                  className={styles.TestimonialTextarea}
                  placeholder={t('profile.writeTestimonial')}
                  value={tText}
                  onChange={(e) => setTText(e.target.value)}
                  maxLength={500}
                />
                <button
                  type="submit"
                  className={styles.PublishBtn}
                  disabled={tLoading || !tText.trim()}
                >
                  {tLoading ? '…' : t('profile.publish')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── Battle Modal ── */}
      {battleDeck && (
        <BattleModal
          deck={battleDeck}
          onClose={() => setBattleDeck(null)}
          onSend={handleDeclareBattle}
          t={t}
        />
      )}

      {/* ── See-All Testimonials Modal ── */}
      {showAllT && (
        <AllTestimonialsModal
          userId={profile.id_user}
          authHeaderRef={authHeaderRef}
          t={t}
          onClose={() => setShowAllT(false)}
        />
      )}
    </div>
  );
}
