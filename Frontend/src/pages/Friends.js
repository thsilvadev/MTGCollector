import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthHeader } from 'react-auth-kit';
import Axios from 'axios';
import { toast } from 'react-toastify';
import styles from '../styles/Friends.module.css';
import { useI18n } from '../i18n/LanguageContext';

// ─── Deterministic avatar color ──────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name }) {
  return (
    <div
      className={styles.Avatar}
      style={{ background: colorFromName(name) }}
    >
      {getInitials(name)}
    </div>
  );
}

function FeedPlaceholder({ t }) {
  return (
    <div className={styles.FeedPlaceholder}>
      <span className={styles.FeedPlaceholderIcon}>🌐</span>
      <span className={styles.FeedPlaceholderText}>{t('friends.feedSoon')}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function Friends() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const authHeader = useAuthHeader();

  const [friends, setFriends] = useState([]);
  const [invites, setInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [addMode, setAddMode] = useState(false);
  const [gameTagInput, setGameTagInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [collapsed, setCollapsed] = useState({ invites: false, friends: false });

  const addInputRef = useRef(null);
  const authHeaderRef = useRef(authHeader);
  authHeaderRef.current = authHeader;

  // ── Fetch data ────────────────────────────────────────────────────────────

  useEffect(() => {
    const cfg = { headers: { Authorization: authHeaderRef.current() } };
    Promise.all([
      Axios.get(`${window.name}/friends`, cfg),
      Axios.get(`${window.name}/friends/requests`, cfg),
    ])
      .then(([friendsRes, requestsRes]) => {
        setFriends(friendsRes.data);
        setInvites(requestsRes.data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── ESC closes add mode ───────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeAddMode(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (addMode && addInputRef.current) addInputRef.current.focus();
  }, [addMode]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function closeAddMode() {
    setAddMode(false);
    setGameTagInput('');
  }

  async function handleSendInvite() {
    const tag = gameTagInput.trim();
    if (!tag) return;
    closeAddMode();
    try {
      await Axios.post(`${window.name}/friends/request`, { game_tag: tag }, { headers: { Authorization: authHeaderRef.current() } });
      toast.success(t('friends.inviteSent'));
    } catch (err) {
      const msg = err?.response?.data?.error || '';
      if (msg.includes('not found')) toast.error(t('friends.notFound'));
      else if (msg.includes('Already friends')) toast.error(t('friends.alreadyFriends'));
      else if (msg.includes('pending')) toast.error(t('friends.requestAlreadySent'));
      else if (msg.includes('yourself')) toast.error(t('friends.cannotAddSelf'));
      else toast.error(msg || t('friends.notFound'));
    }
  }

  async function handleAccept(invite) {
    try {
      await Axios.put(`${window.name}/friends/request/${invite.id_request}/accept`, {}, { headers: { Authorization: authHeaderRef.current() } });
      setInvites((prev) => prev.filter((i) => i.id_request !== invite.id_request));
      setFriends((prev) => [
        ...prev,
        { id_friendship: null, id_user: invite.id_user, name: invite.name, game_tag: invite.game_tag, lastSeen: null },
      ]);
      toast.success(t('friends.accepted'));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDecline(invite) {
    try {
      await Axios.put(`${window.name}/friends/request/${invite.id_request}/decline`, {}, { headers: { Authorization: authHeaderRef.current() } });
      setInvites((prev) => prev.filter((i) => i.id_request !== invite.id_request));
      toast.info(t('friends.declined'));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRemove(friend) {
    try {
      await Axios.delete(`${window.name}/friends/${friend.id_user}`, { headers: { Authorization: authHeaderRef.current() } });
      setFriends((prev) => prev.filter((f) => f.id_user !== friend.id_user));
      toast.info(t('friends.removed'));
    } catch (err) {
      toast.error(t('friends.removedError'));
    }
  }

  function toggleSection(key) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Filtered friends ──────────────────────────────────────────────────────

  const filteredFriends = friends.filter((f) =>
    (f.game_tag || f.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const sidebar = (
    <div className={styles.Sidebar}>
      {/* Sidebar header */}
      <div className={styles.SidebarHeader}>
        <h2 className={styles.SidebarTitle}>{t('friends.title')}</h2>
        <button
          className={styles.AddBtn}
          onClick={() => (addMode ? closeAddMode() : setAddMode(true))}
          title={addMode ? t('friends.cancelAdd') : t('friends.addFriend')}
          aria-label={addMode ? t('friends.cancelAdd') : t('friends.addFriend')}
        >
          {addMode ? '✕' : '+'}
        </button>
      </div>

      {/* Add mode input */}
      {addMode && (
        <div className={styles.AddModeRow}>
          <input
            ref={addInputRef}
            className={styles.AddModeInput}
            type="text"
            placeholder={t('friends.gameTagPlaceholder')}
            value={gameTagInput}
            onChange={(e) => setGameTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendInvite(); }}
          />
          <button className={styles.SendBtn} onClick={handleSendInvite}>
            {t('friends.sendInvite')}
          </button>
        </div>
      )}

      {/* Search — hidden in add mode */}
      {!addMode && (
        <input
          className={styles.SearchInput}
          type="text"
          placeholder={t('friends.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      )}

      {/* ── Invites section ── */}
      <button
        className={styles.SectionHeader}
        onClick={() => toggleSection('invites')}
        aria-expanded={!collapsed.invites}
      >
        <span>{t('friends.invites')}</span>
        {invites.length > 0 && (
          <span className={styles.SectionHeaderBadge}>{invites.length}</span>
        )}
        <span className={`${styles.Chevron} ${collapsed.invites ? styles.ChevronClosed : styles.ChevronOpen}`}>
          ▼
        </span>
      </button>

      <div
        className={styles.SectionBody}
        style={collapsed.invites ? { display: 'none' } : {}}
      >
        {invites.length === 0 ? (
          <p className={styles.EmptyText}>{t('friends.noInvites')}</p>
        ) : (
          invites.map((invite) => (
            <div key={invite.id_request} className={styles.InviteItem}>
              <div className={styles.AvatarWrapper}>
                <Avatar name={invite.game_tag || invite.name} />
              </div>
              <div className={styles.FriendInfo}>
                <div className={styles.FriendName}>{invite.game_tag || invite.name}</div>
                {invite.mutualCount > 0 && (
                  <div className={styles.InviteMutual}>
                    {t('friends.mutualFriends').replace('{n}', invite.mutualCount)}
                  </div>
                )}
              </div>
              <div className={styles.FriendActions}>
                <button
                  className={`${styles.ActionBtn} ${styles.ActionBtnDecline}`}
                  onClick={() => handleDecline(invite)}
                  title={t('friends.decline')}
                >
                  ✕
                </button>
                <button
                  className={`${styles.ActionBtn} ${styles.ActionBtnAccept}`}
                  onClick={() => handleAccept(invite)}
                  title={t('friends.accept')}
                >
                  ✓
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Friends section ── */}
      <button
        className={styles.SectionHeader}
        onClick={() => toggleSection('friends')}
        aria-expanded={!collapsed.friends}
      >
        <span>{t('friends.section').replace('{n}', filteredFriends.length)}</span>
        <span className={`${styles.Chevron} ${collapsed.friends ? styles.ChevronClosed : styles.ChevronOpen}`}>
          ▼
        </span>
      </button>

      <div
        className={styles.SectionBody}
        style={collapsed.friends ? { display: 'none' } : {}}
      >
        {isLoading ? null : filteredFriends.length === 0 ? (
          <p className={styles.EmptyText}>{t('friends.noFriends')}</p>
        ) : (
          filteredFriends.map((friend) => (
            <div
              key={friend.id_user}
              className={styles.FriendItem}
              onClick={() => navigate(`/amigos/${friend.id_user}`)}
            >
              <div className={styles.AvatarWrapper}>
                <Avatar name={friend.game_tag || friend.name} />
                {friend.lastSeen === 'online' && <span className={styles.OnlineDot} />}
              </div>
              <div className={styles.FriendInfo}>
                <div className={styles.FriendName}>{friend.game_tag || friend.name}</div>
              </div>
              <div className={styles.FriendActions}>
                <button
                  className={`${styles.ActionBtn} ${styles.ActionBtnRemove}`}
                  onClick={(e) => { e.stopPropagation(); handleRemove(friend); }}
                  title={t('friends.removeFriend')}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className={styles.PageWrapper}>
      {sidebar}

      {/* Desktop: main area */}
      <div className={styles.MainArea}>
        <div className={styles.MainAreaHeader}>
          <h1 className={styles.MainAreaTitle}>{t('friends.feedTitle')}</h1>
          <p className={styles.MainAreaSubtitle}>{t('friends.feedSubtitle')}</p>
        </div>
        <FeedPlaceholder t={t} />
      </div>

      {/* Mobile: feed placeholder below sidebar */}
      <div className={styles.MobileFeedArea}>
        <FeedPlaceholder t={t} />
      </div>
    </div>
  );
}

export default Friends;
