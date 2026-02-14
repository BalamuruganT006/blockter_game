// src/components/Footer.jsx

export default function Footer({ onEnterGame, isAuthenticated, onOpenAuth }) {
  const handlePlay = () => {
    if (isAuthenticated) {
      onEnterGame();
    } else {
      onOpenAuth?.();
    }
  };

  return (
    <footer className="landing-footer">
      <div className="footer-cta">
        <h2 className="cta-title">READY TO LAUNCH?</h2>
        <p className="cta-subtitle">Join 10,000+ pilots in the galaxy</p>
        <button className="btn-primary huge" onClick={handlePlay}>
          PLAY FREE NOW
          <span className="btn-arrow">→</span>
        </button>
      </div>

      <div className="footer-content">
        <div className="footer-brand">
          <span className="brand-icon">🚀</span>
          <span className="brand-name">SPACE SHOOTER</span>
          <p className="brand-tagline">The future of web3 gaming</p>
        </div>

        <div className="footer-links">
          <div className="link-group">
            <h4>GAME</h4>
            <a href="#features">Features</a>
            <a href="#nft">NFT Ships</a>
            <a href="#roadmap">Roadmap</a>
          </div>
          <div className="link-group">
            <h4>RESOURCES</h4>
            <a href="#">Whitepaper</a>
            <a href="#">Tokenomics</a>
            <a href="#">Audit</a>
          </div>
          <div className="link-group">
            <h4>COMMUNITY</h4>
            <a href="#">Discord</a>
            <a href="#">Twitter</a>
            <a href="#">Telegram</a>
          </div>
        </div>

        <div className="footer-newsletter">
          <h4>STAY UPDATED</h4>
          <div className="newsletter-form">
            <input type="email" placeholder="Enter your email" />
            <button>SUBSCRIBE</button>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2024 Space Shooter. Powered by Shardeum.</p>
        <div className="footer-badges">
          <span className="badge">🔒 Audited</span>
          <span className="badge">⛓ On-Chain</span>
          <span className="badge">🎮 Play-to-Earn</span>
        </div>
      </div>
    </footer>
  );
}
