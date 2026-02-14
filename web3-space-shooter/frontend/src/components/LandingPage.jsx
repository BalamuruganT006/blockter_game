// src/components/LandingPage.jsx
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import GamePreviewSection from './GamePreviewSection';
import NFTSection from './NFTSection';
import RoadmapSection from './RoadmapSection';
import TeamSection from './TeamSection';
import Footer from './Footer';
import AuthModal from './AuthModal';
import UserMenu from './UserMenu';
import '../styles/landing.css';

export default function LandingPage({ onEnterGame }) {
  const [scrollY, setScrollY] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const containerRef = useRef(null);

  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleAuthSuccess = () => {
    console.log('Auth successful!');
  };

  const openSignIn = () => {
    setAuthMode('signin');
    setShowAuth(true);
  };

  const openSignUp = () => {
    setAuthMode('signup');
    setShowAuth(true);
  };

  return (
    <div ref={containerRef} className="landing-page">
      {/* Custom Cursor */}
      <div 
        className="custom-cursor"
        style={{ 
          transform: `translate(${cursorPos.x}px, ${cursorPos.y}px)` 
        }}
      >
        <div className="cursor-dot"></div>
        <div className="cursor-ring"></div>
      </div>

      {/* Navigation */}
      <nav className={`landing-nav ${scrollY > 100 ? 'scrolled' : ''}`}>
        <div className="nav-logo">
          <span className="logo-icon">🚀</span>
          <span className="logo-text">SPACE SHOOTER</span>
        </div>
        
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#gameplay">Gameplay</a>
          <a href="#nft">NFT Ships</a>
          <a href="#roadmap">Roadmap</a>
        </div>

        <div className="nav-auth">
          {isAuthenticated ? (
            <UserMenu user={user} onLogout={logout} onEnterGame={onEnterGame} />
          ) : (
            <div className="auth-buttons">
              <button className="btn-signin" onClick={openSignIn}>
                SIGN IN
              </button>
              <button className="btn-signup" onClick={openSignUp}>
                SIGN UP
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Sections */}
      <HeroSection 
        onEnterGame={onEnterGame} 
        scrollY={scrollY}
        isAuthenticated={isAuthenticated}
        onOpenAuth={openSignUp}
      />
      <FeaturesSection />
      <GamePreviewSection />
      <NFTSection isAuthenticated={isAuthenticated} onOpenAuth={openSignUp} />
      <RoadmapSection />
      <TeamSection />
      <Footer 
        onEnterGame={onEnterGame} 
        isAuthenticated={isAuthenticated}
        onOpenAuth={openSignUp}
      />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        initialMode={authMode}
        onSuccess={handleAuthSuccess}
      />

      {/* Scroll Progress */}
      <div 
        className="scroll-progress"
        style={{ 
          transform: `scaleX(${Math.min(scrollY / (document.body.scrollHeight - window.innerHeight), 1)})` 
        }}
      />
    </div>
  );
}
