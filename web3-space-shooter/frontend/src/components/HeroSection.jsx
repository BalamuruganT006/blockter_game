// src/components/HeroSection.jsx
import { useEffect, useRef } from 'react';

export default function HeroSection({ onEnterGame, scrollY, isAuthenticated, onOpenAuth }) {
  const canvasRef = useRef(null);

  // Starfield animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: Math.random() * 0.5 + 0.1,
        brightness: Math.random()
      });
    }

    let animationId;
    const animate = () => {
      ctx.fillStyle = 'rgba(5, 8, 20, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        star.y += star.speed;
        star.brightness += (Math.random() - 0.5) * 0.1;
        star.brightness = Math.max(0.3, Math.min(1, star.brightness));

        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 243, 255, ${star.brightness})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <section className="hero-section">
      <canvas ref={canvasRef} className="starfield-canvas"></canvas>
      
      <div 
        className="hero-content"
        style={{ transform: `translateY(${scrollY * 0.3}px)` }}
      >
        <div className="hero-badge">
          <span className="pulse-dot"></span>
          WEB3 ARCADE ON SHARDEUM
        </div>
        
        <h1 className="hero-title">
          <span className="title-line">DEFEND THE</span>
          <span className="title-line gradient">GALAXY</span>
          <span className="title-line">EARN CRYPTO</span>
        </h1>
        
        <p className="hero-subtitle">
          The first play-to-earn space shooter on Shardeum blockchain. 
          Pilot NFT ships, destroy aliens, and claim real rewards.
        </p>
        
        <div className="hero-stats">
          <div className="stat-item">
            <span className="stat-number">10K+</span>
            <span className="stat-label">Pilots</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">$SPACE</span>
            <span className="stat-label">Token</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">100+</span>
            <span className="stat-label">NFT Ships</span>
          </div>
        </div>
        
        <div className="hero-buttons">
          {isAuthenticated ? (
            <button className="btn-primary" onClick={onEnterGame}>
              <span className="btn-text">LAUNCH GAME</span>
              <span className="btn-shine"></span>
            </button>
          ) : (
            <>
              <button className="btn-primary" onClick={onOpenAuth}>
                <span className="btn-text">START JOURNEY</span>
                <span className="btn-shine"></span>
              </button>
              <button className="btn-secondary" onClick={onOpenAuth}>
                <span className="btn-icon">▶</span>
                WATCH TRAILER
              </button>
            </>
          )}
        </div>
      </div>

      {/* Floating Elements */}
      <div className="floating-ship" style={{ transform: `translateY(${-scrollY * 0.2}px) rotate(${scrollY * 0.05}deg)` }}>
        <div className="ship-glow"></div>
        <div className="ship-body">🚀</div>
      </div>

      <div className="scroll-indicator">
        <div className="mouse">
          <div className="wheel"></div>
        </div>
        <span>SCROLL TO EXPLORE</span>
      </div>
    </section>
  );
}
