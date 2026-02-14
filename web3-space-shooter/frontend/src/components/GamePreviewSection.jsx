// src/components/GamePreviewSection.jsx
import { useEffect, useRef, useState } from 'react';

export default function GamePreviewSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef(null);

  // Mini game preview
  useEffect(() => {
    if (!isPlaying) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 400;

    let animationId;
    let playerX = 400;
    let bullets = [];
    let enemies = [];
    let score = 0;

    const gameLoop = () => {
      ctx.fillStyle = 'rgba(5, 8, 20, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Player
      ctx.fillStyle = '#00f3ff';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00f3ff';
      ctx.beginPath();
      ctx.moveTo(playerX, 350);
      ctx.lineTo(playerX - 15, 380);
      ctx.lineTo(playerX + 15, 380);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Bullets
      bullets = bullets.filter(b => {
        b.y -= 8;
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(b.x - 2, b.y, 4, 10);
        return b.y > 0;
      });

      // Enemies
      if (Math.random() < 0.02) {
        enemies.push({ x: Math.random() * 750 + 25, y: 0, hp: 2 });
      }

      enemies = enemies.filter(e => {
        e.y += 2;
        ctx.fillStyle = e.hp > 1 ? '#ffd700' : '#ff6b6b';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Collision
        bullets.forEach((b, bi) => {
          if (Math.abs(b.x - e.x) < 20 && Math.abs(b.y - e.y) < 20) {
            e.hp--;
            bullets.splice(bi, 1);
            if (e.hp <= 0) score += 100;
          }
        });

        return e.y < 400 && e.hp > 0;
      });

      // Score
      ctx.fillStyle = '#fff';
      ctx.font = '20px Orbitron';
      ctx.fillText(`SCORE: ${score}`, 20, 30);

      animationId = requestAnimationFrame(gameLoop);
    };

    // Auto-shoot
    const shootInterval = setInterval(() => {
      bullets.push({ x: playerX, y: 350 });
    }, 200);

    // Auto-move
    let direction = 1;
    const moveInterval = setInterval(() => {
      playerX += 5 * direction;
      if (playerX > 750 || playerX < 50) direction *= -1;
    }, 50);

    gameLoop();

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(shootInterval);
      clearInterval(moveInterval);
    };
  }, [isPlaying]);

  return (
    <section id="gameplay" className="game-preview-section">
      <div className="preview-container">
        <div className="preview-text">
          <span className="section-tag">EXPERIENCE</span>
          <h2 className="section-title">
            PILOT YOUR <span className="gradient">DESTINY</span>
          </h2>
          <p className="preview-desc">
            Intense arcade action meets blockchain rewards. Every shot fired, 
            every enemy destroyed, every high score achieved is permanently 
            recorded on Shardeum.
          </p>
          
          <div className="preview-features">
            <div className="preview-item">
              <span className="item-icon">⚡</span>
              <span>60 FPS Action</span>
            </div>
            <div className="preview-item">
              <span className="item-icon">🎯</span>
              <span>Precision Controls</span>
            </div>
            <div className="preview-item">
              <span className="item-icon">💎</span>
              <span>Rare Loot Drops</span>
            </div>
          </div>

          <button 
            className="btn-primary large"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? 'STOP DEMO' : 'PLAY DEMO'}
          </button>
        </div>

        <div className="preview-screen">
          <div className="screen-frame">
            <div className="screen-header">
              <span className="screen-dot red"></span>
              <span className="screen-dot yellow"></span>
              <span className="screen-dot green"></span>
              <span className="screen-title">SPACE_SHOOTER.exe</span>
            </div>
            <div className="screen-content">
              {isPlaying ? (
                <canvas ref={canvasRef} className="game-canvas"></canvas>
              ) : (
                <div className="screen-placeholder">
                  <div className="placeholder-icon">🎮</div>
                  <p>Click &quot;PLAY DEMO&quot; to start</p>
                </div>
              )}
            </div>
          </div>
          <div className="screen-glow"></div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="preview-decoration">
        <div className="deco-line"></div>
        <div className="deco-circle"></div>
      </div>
    </section>
  );
}
