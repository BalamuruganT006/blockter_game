// src/components/UserMenu.jsx
import { useState, useRef, useEffect } from 'react';

export default function UserMenu({ user, onLogout, onEnterGame }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="user-menu" ref={menuRef}>
      <button className="user-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="user-avatar">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" />
          ) : (
            <span>{user?.displayName?.[0] || user?.email?.[0] || '?'}</span>
          )}
        </div>
        <span className="user-name">{user?.displayName || 'Pilot'}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="user-dropdown">
          <div className="dropdown-header">
            <p className="user-email">{user?.email}</p>
          </div>
          
          <div className="dropdown-stats">
            <div className="stat">
              <span className="stat-value">1,250</span>
              <span className="stat-label">High Score</span>
            </div>
            <div className="stat">
              <span className="stat-value">5</span>
              <span className="stat-label">Ships</span>
            </div>
          </div>

          <div className="dropdown-actions">
            <button className="action-btn primary" onClick={() => {
              onEnterGame();
              setIsOpen(false);
            }}>
              🎮 PLAY NOW
            </button>
            <button className="action-btn" onClick={() => {}}>
              ⚙️ Settings
            </button>
            <button className="action-btn" onClick={() => {}}>
              🏆 My Stats
            </button>
            <hr />
            <button className="action-btn logout" onClick={() => {
              onLogout();
              setIsOpen(false);
            }}>
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
