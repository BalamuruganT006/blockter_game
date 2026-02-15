// src/game/entities/Enemy.js
import { Bullet } from './Bullet.js';

export class Enemy {
  constructor(canvas, type = 'basic', difficulty = 1) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.type = type;
    
    // Position - spawn at random x, above screen
    this.x = Math.random() * (canvas.width - 30) + 15;
    this.y = -30;
    this.width = 25;
    this.height = 25;
    
    // Stats based on type
    const types = {
      basic: { health: 20, speed: 2, score: 10, color: '#ff6b6b', fireRate: 0 },
      fast: { health: 10, speed: 5, score: 20, color: '#ffd93d', fireRate: 0 },
      tank: { health: 60, speed: 1, score: 50, color: '#6bcf7f', fireRate: 0.5 },
      shooter: { health: 30, speed: 1.5, score: 30, color: '#ff0055', fireRate: 1.5 },
      boss: { health: 200, speed: 0.8, score: 500, color: '#9d4edd', fireRate: 2 }
    };
    
    const stats = types[type] || types.basic;
    this.maxHealth = stats.health * difficulty;
    this.health = this.maxHealth;
    this.speed = stats.speed;
    this.scoreValue = stats.score * difficulty;
    this.color = stats.color;
    this.fireRate = stats.fireRate;
    
    // Movement pattern
    this.pattern = Math.random() > 0.5 ? 'sine' : 'straight';
    this.patternOffset = Math.random() * Math.PI * 2;
    this.patternSpeed = 0.02;
    
    // Shooting
    this.lastShot = 0;
    this.shootCooldown = 1000 / this.fireRate;
    this.bullets = [];
    
    // Animation
    this.rotation = 0;
    this.pulse = 0;
    
    this.active = true;
  }

  update(playerX, deltaTime) {
    // Movement patterns
    if (this.pattern === 'sine') {
      this.x += Math.sin(this.patternOffset) * 2;
      this.patternOffset += this.patternSpeed;
    }
    
    this.y += this.speed;
    
    // Rotate towards player if shooter
    if (this.fireRate > 0) {
      this.rotation = Math.atan2(0, playerX - this.x);
      
      if (Date.now() - this.lastShot > this.shootCooldown) {
        this.shoot();
        this.lastShot = Date.now();
      }
    }
    
    // Update bullets
    this.bullets = this.bullets.filter(bullet => {
      bullet.update();
      return bullet.active;
    });
    
    // Pulse animation
    this.pulse += 0.1;
    
    // Check if off screen
    if (this.y > this.canvas.height + 50) {
      this.active = false;
    }
  }

  shoot() {
    const angle = Math.atan2(300 - this.y, 400 - this.x); // Aim at center roughly
    
    this.bullets.push(new Bullet(
      this.ctx,
      this.x,
      this.y + this.height/2,
      Math.cos(angle) * 4,
      Math.sin(angle) * 4,
      10,
      'enemy',
      '#00ff00'
    ));
  }

  takeDamage(amount) {
    this.health -= amount;
    
    // Hit flash effect
    this.color = '#ffffff';
    setTimeout(() => {
      this.color = this.getOriginalColor();
    }, 50);
    
    if (this.health <= 0) {
      this.active = false;
      return true; // Destroyed
    }
    return false;
  }

  getOriginalColor() {
    const colors = {
      basic: '#ff6b6b',
      fast: '#ffd93d',
      tank: '#6bcf7f',
      shooter: '#ff0055',
      boss: '#9d4edd'
    };
    return colors[this.type];
  }

  draw() {
    this.ctx.save();
    
    // Glow effect
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = this.color;
    
    // Pulsing size
    const pulseSize = Math.sin(this.pulse) * 2;
    
    // Draw based on type
    switch(this.type) {
      case 'basic':
        this.drawBasic(pulseSize);
        break;
      case 'fast':
        this.drawFast(pulseSize);
        break;
      case 'tank':
        this.drawTank(pulseSize);
        break;
      case 'shooter':
        this.drawShooter(pulseSize);
        break;
      case 'boss':
        this.drawBoss(pulseSize);
        break;
    }
    
    // Health bar for tank/boss
    if (this.type === 'tank' || this.type === 'boss') {
      this.drawHealthBar();
    }
    
    this.ctx.restore();
    
    // Draw bullets
    this.bullets.forEach(bullet => bullet.draw());
  }

  drawBasic(pulse) {
    this.ctx.fillStyle = this.color;
    this.ctx.beginPath();
    this.ctx.moveTo(this.x, this.y + this.height/2 + pulse);
    this.ctx.lineTo(this.x + this.width/2, this.y - this.height/2);
    this.ctx.lineTo(this.x - this.width/2, this.y - this.height/2);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawFast(pulse) {
    this.ctx.fillStyle = this.color;
    this.ctx.beginPath();
    this.ctx.ellipse(this.x, this.y, this.width/2 + pulse, this.height/2, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawTank(pulse) {
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(
      this.x - this.width/2 - pulse,
      this.y - this.height/2 - pulse,
      this.width + pulse * 2,
      this.height + pulse * 2
    );
  }

  drawShooter(pulse) {
    this.ctx.fillStyle = this.color;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.width/2 + pulse, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Inner core
    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.width/4, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawBoss(pulse) {
    // Complex boss shape
    this.ctx.fillStyle = this.color;
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r = this.width/2 + pulse + (i % 2 === 0 ? 6 : 0);
      const x = this.x + Math.cos(angle) * r;
      const y = this.y + Math.sin(angle) * r;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawHealthBar() {
    const barWidth = this.width;
    const barHeight = 3;
    const healthPercent = this.health / this.maxHealth;
    
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(this.x - barWidth/2, this.y - this.height/2 - 10, barWidth, barHeight);
    
    this.ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : healthPercent > 0.25 ? '#ff0' : '#f00';
    this.ctx.fillRect(this.x - barWidth/2, this.y - this.height/2 - 10, barWidth * healthPercent, barHeight);
  }

  getBounds() {
    return {
      x: this.x - this.width/2,
      y: this.y - this.height/2,
      width: this.width,
      height: this.height
    };
  }
}