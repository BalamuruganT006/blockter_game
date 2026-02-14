// src/game/engine/GameLoop.js
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Collision } from '../engine/Collision.js';

export class GameEngine {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks || {};
    
    // Game state
    this.isRunning = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.difficulty = 1;
    
    // Entities
    this.player = null;
    this.enemies = [];
    this.particles = [];
    this.powerUps = [];
    
    // Input
    this.input = {
      keys: {}
    };
    
    // Timing
    this.lastTime = Date.now();
    this.animationId = null;
    this.lastSpawn = 0;
    this.spawnRate = 2000;
    this.deltaTime = 0;
    
    // Enemy types for current level
    this.enemyTypes = ['basic'];
    
    // Bindings
    this.gameLoop = this.gameLoop.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    
    this.setupInput();
    this.stars = this.generateStars();
  }

  setupInput() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown(e) {
    this.input.keys[e.key] = true;
  }

  handleKeyUp(e) {
    this.input.keys[e.key] = false;
  }

  generateStars() {
    const stars = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 1.5,
        opacity: Math.random() * 0.5 + 0.5,
        speed: Math.random() * 0.5 + 0.2,
        brightness: Math.random() * 0.5 + 0.5
      });
    }
    return stars;
  }

  start(shipStats = null) {
    this.player = new Player(
      this.canvas,
      this.canvas.width / 2,
      this.canvas.height - 80,
      shipStats
    );
    
    this.isRunning = true;
    this.isGameOver = false;
    this.isPaused = false;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.difficulty = 1;
    this.enemies = [];
    this.particles = [];
    this.powerUps = [];
    this.lastTime = performance.now();
    this.lastSpawn = performance.now();
    this.spawnRate = 2000;
    this.enemyTypes = ['basic'];
    
    // Start the game loop
    requestAnimationFrame(this.gameLoop);
  }

  stop() {
    this.isRunning = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  togglePause() {
    if (!this.isGameOver) {
      this.isPaused = !this.isPaused;
    }
  }

  restart() {
    this.start(this.player ? {
      speed: this.player.speed / 3,
      health: this.player.maxHealth / 10,
      fireRate: this.player.fireRate,
      damage: this.player.damage
    } : null);
  }

  gameLoop(currentTime) {
    if (!this.isRunning) return;
    
    // Calculate delta time
    this.deltaTime = Math.min(currentTime - this.lastTime, 32); // Cap at 32ms to prevent jumps
    this.lastTime = currentTime;
    this.currentTime = currentTime;
    
    if (!this.isPaused && !this.isGameOver) {
      this.update();
    }
    
    this.draw();
    
    requestAnimationFrame(this.gameLoop);
  }

  update() {
    const currentTime = this.currentTime;
    
    // Update stars (parallax background)
    this.stars.forEach(star => {
      star.y += star.speed * (this.deltaTime / 16);
      if (star.y > this.canvas.height) {
        star.y = 0;
        star.x = Math.random() * this.canvas.width;
      }
    });
    
    // Update player
    this.player.update(this.input, this.deltaTime);
    
    // Spawn enemies
    if (currentTime - this.lastSpawn > this.spawnRate) {
      this.spawnEnemy();
      this.lastSpawn = currentTime;
      
      // Increase difficulty over time
      this.spawnRate = Math.max(500, 2000 - (this.score / 10));
    }
    
    // Update enemies
    this.enemies = this.enemies.filter(enemy => {
      enemy.update(this.player.x, this.deltaTime);
      
      // Check collision with player bullets
      this.player.bullets.forEach(bullet => {
        if (Collision.check(bullet.getBounds(), enemy.getBounds())) {
          bullet.active = false;
          
          if (enemy.takeDamage(bullet.damage)) {
            // Enemy destroyed
            this.score += enemy.scoreValue;
            this.createExplosion(enemy.x, enemy.y, enemy.color);

            // Notify kill event
            if (this.callbacks.onEnemyKill) {
              this.callbacks.onEnemyKill(enemy);
            }
            
            // Chance to drop power-up
            if (Math.random() < 0.1) {
              this.spawnPowerUp(enemy.x, enemy.y);
            }
          }
        }
      });
      
      // Check collision with player
      if (!this.player.invulnerable && Collision.check(this.player.getBounds(), enemy.getBounds())) {
        if (this.player.takeDamage(20)) {
          this.lives--;
          if (this.callbacks.onLivesUpdate) {
            this.callbacks.onLivesUpdate(this.lives);
          }
          if (this.lives <= 0) {
            this.gameOver();
          } else {
            this.player.health = this.player.maxHealth;
          }
        }
        enemy.active = false;
        this.createExplosion(enemy.x, enemy.y, '#ff0000');
      }
      
      // Check enemy bullets hitting player
      enemy.bullets.forEach(bullet => {
        if (bullet.active && !this.player.invulnerable && 
            Collision.check(bullet.getBounds(), this.player.getBounds())) {
          bullet.active = false;
          if (this.player.takeDamage(bullet.damage)) {
            this.lives--;
            if (this.callbacks.onLivesUpdate) {
              this.callbacks.onLivesUpdate(this.lives);
            }
            if (this.lives <= 0) {
              this.gameOver();
            }
          }
        }
      });
      
      return enemy.active;
    });
    
    // Update particles
    this.particles = this.particles.filter(particle => {
      particle.update();
      return particle.life > 0;
    });
    
    // Update power-ups
    this.powerUps = this.powerUps.filter(powerUp => {
      powerUp.y += 2;
      
      if (Collision.check(this.player.getBounds(), {
        x: powerUp.x - 15,
        y: powerUp.y - 15,
        width: 30,
        height: 30
      })) {
        this.applyPowerUp(powerUp.type);
        return false;
      }
      
      return powerUp.y < this.canvas.height + 50;
    });
    
    // Update score callback
    if (this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate(this.score);
    }
    
    // Level progression
    const newLevel = Math.floor(this.score / 500) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.difficulty = 1 + (this.level - 1) * 0.2;
      this.enemyTypes = this.getEnemyTypesForLevel(this.level);
      if (this.callbacks.onLevelUp) {
        this.callbacks.onLevelUp(this.level);
      }
    }
  }

  spawnEnemy() {
    const type = this.enemyTypes[Math.floor(Math.random() * this.enemyTypes.length)];
    this.enemies.push(new Enemy(this.canvas, type, this.difficulty));
  }

  getEnemyTypesForLevel(level) {
    if (level === 1) return ['basic'];
    if (level === 2) return ['basic', 'fast'];
    if (level === 3) return ['basic', 'fast', 'tank'];
    if (level === 4) return ['basic', 'fast', 'tank', 'shooter'];
    return ['basic', 'fast', 'tank', 'shooter', 'boss'];
  }

  spawnPowerUp(x, y) {
    const types = ['health', 'speed', 'damage', 'shield'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    this.powerUps.push({
      x, y, type,
      color: this.getPowerUpColor(type)
    });
  }

  getPowerUpColor(type) {
    const colors = {
      health: '#ff4444',
      speed: '#4444ff',
      damage: '#ffaa00',
      shield: '#44ff44'
    };
    return colors[type] || '#ffffff';
  }

  applyPowerUp(type) {
    if (this.callbacks.onPowerUp) {
      this.callbacks.onPowerUp(type);
    }
    switch(type) {
      case 'health':
        this.player.heal(30);
        break;
      case 'speed':
        this.player.speed = Math.min(this.player.speed + 2, 15);
        break;
      case 'damage':
        this.player.damage += 5;
        break;
      case 'shield':
        this.player.invulnerable = true;
        this.player.invulnerableTime = 3000;
        break;
    }
  }

  createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
      this.particles.push(new Particle(this.ctx, x, y, color));
    }
  }

  draw() {
    // Clear canvas with fade effect for trails
    this.ctx.fillStyle = 'rgba(10, 14, 39, 0.3)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw stars
    this.ctx.save();
    this.stars.forEach(star => {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.restore();
    
    // Draw game entities
    if (this.player) {
      this.player.draw();
    }
    
    this.enemies.forEach(enemy => enemy.draw());
    this.particles.forEach(particle => particle.draw());
    
    // Draw power-ups
    this.powerUps.forEach(powerUp => {
      this.ctx.save();
      this.ctx.fillStyle = powerUp.color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = powerUp.color;
      this.ctx.beginPath();
      this.ctx.arc(powerUp.x, powerUp.y, 15, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Icon
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(powerUp.type[0].toUpperCase(), powerUp.x, powerUp.y + 4);
      this.ctx.restore();
    });
    
    // Draw UI
    this.drawUI();
    
    // Draw pause overlay
    if (this.isPaused) {
      this.drawPauseScreen();
    }
    
    // Draw game over screen
    if (this.isGameOver) {
      this.drawGameOverScreen();
    }
  }

  drawUI() {
    // Lives
    this.ctx.save();
    this.ctx.fillStyle = '#ff0055';
    for (let i = 0; i < this.lives; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(30 + i * 25, 30);
      this.ctx.lineTo(35 + i * 25, 40);
      this.ctx.lineTo(25 + i * 25, 40);
      this.ctx.closePath();
      this.ctx.fill();
    }
    
    // Health bar
    const healthPercent = this.player.health / this.player.maxHealth;
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(20, 50, 100, 10);
    this.ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : healthPercent > 0.25 ? '#ff0' : '#f00';
    this.ctx.fillRect(20, 50, 100 * healthPercent, 10);
    
    // Level
    this.ctx.fillStyle = '#00f3ff';
    this.ctx.font = '20px Orbitron';
    this.ctx.fillText(`LEVEL ${this.level}`, this.canvas.width - 100, 40);
    this.ctx.restore();
  }

  drawPauseScreen() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = '#00f3ff';
    this.ctx.font = '40px Orbitron';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('PAUSED', this.canvas.width/2, this.canvas.height/2);
    
    this.ctx.font = '20px Orbitron';
    this.ctx.fillText('Press ESC to resume', this.canvas.width/2, this.canvas.height/2 + 50);
    this.ctx.fillText('Press N for new game', this.canvas.width/2, this.canvas.height/2 + 80);
    this.ctx.restore();
  }

  drawGameOverScreen() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = '#ff0055';
    this.ctx.font = '50px Orbitron';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.canvas.width/2, this.canvas.height/2 - 50);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '30px Orbitron';
    this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 20);
    
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = '25px Orbitron';
    this.ctx.fillText(`Level Reached: ${this.level}`, this.canvas.width/2, this.canvas.height/2 + 60);
    
    this.ctx.fillStyle = '#00f3ff';
    this.ctx.font = '20px Orbitron';
    this.ctx.fillText('Press N to play again', this.canvas.width/2, this.canvas.height/2 + 120);
    this.ctx.restore();
  }

  gameOver() {
    this.isGameOver = true;
    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver(this.score, this.level, this.difficulty);
    }
  }
}

// Particle class for explosions
class Particle {
  constructor(ctx, x, y, color) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 10;
    this.vy = (Math.random() - 0.5) * 10;
    this.life = 1.0;
    this.color = color;
    this.size = Math.random() * 5 + 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.life -= 0.02;
    this.size *= 0.95;
  }

  draw() {
    this.ctx.save();
    this.ctx.globalAlpha = this.life;
    this.ctx.fillStyle = this.color;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }
}