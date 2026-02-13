// src/game/entities/Player.js
import { Bullet } from './Bullet.js';

export class Player {
  constructor(canvas, x, y, shipStats = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Position
    this.x = x;
    this.y = y;
    this.width = 50;
    this.height = 50;
    
    // Movement
    this.speed = shipStats?.speed ? shipStats.speed * 3 : 5;
    this.velocityX = 0;
    this.velocityY = 0;
    
    // Stats from NFT or default
    this.maxHealth = shipStats?.health ? shipStats.health * 10 : 100;
    this.health = this.maxHealth;
    this.fireRate = shipStats?.fireRate ? shipStats.fireRate : 5;
    this.damage = shipStats?.damage ? shipStats.damage : 10;
    
    // Shooting
    this.lastShot = 0;
    this.shootCooldown = 1000 / this.fireRate;
    this.bullets = [];
    
    // Visuals
    this.color = '#00f3ff';
    this.trail = [];
    this.invulnerable = false;
    this.invulnerableTime = 0;
    
    // Animation
    this.frame = 0;
    this.enginePower = 0;
  }

  update(input, deltaTime) {
    // Handle input
    this.velocityX = 0;
    this.velocityY = 0;
    
    if (input.keys['ArrowLeft'] || input.keys['a']) {
      this.velocityX = -this.speed;
      this.enginePower = 1;
    }
    if (input.keys['ArrowRight'] || input.keys['d']) {
      this.velocityX = this.speed;
      this.enginePower = 1;
    }
    if (input.keys['ArrowUp'] || input.keys['w']) {
      this.velocityY = -this.speed;
    }
    if (input.keys['ArrowDown'] || input.keys['s']) {
      this.velocityY = this.speed;
    }
    
    // Update position with boundary checking
    this.x += this.velocityX;
    this.y += this.velocityY;
    
    // Keep within canvas
    this.x = Math.max(this.width/2, Math.min(this.canvas.width - this.width/2, this.x));
    this.y = Math.max(this.height/2, Math.min(this.canvas.height - this.height/2, this.y));
    
    // Engine trail effect
    if (this.enginePower > 0) {
      this.trail.push({
        x: this.x,
        y: this.y + this.height/2,
        life: 1.0,
        size: Math.random() * 5 + 3
      });
    }
    
    // Update trail
    this.trail = this.trail.filter(particle => {
      particle.y += 2;
      particle.life -= 0.05;
      particle.size *= 0.95;
      return particle.life > 0;
    });
    
    // Handle shooting
    if (input.keys[' '] && Date.now() - this.lastShot > this.shootCooldown) {
      this.shoot();
      this.lastShot = Date.now();
    }
    
    // Update bullets
    this.bullets = this.bullets.filter(bullet => {
      bullet.update();
      return bullet.active;
    });
    
    // Invulnerability frame
    if (this.invulnerable) {
      this.invulnerableTime -= deltaTime;
      if (this.invulnerableTime <= 0) {
        this.invulnerable = false;
      }
    }
    
    this.frame++;
    this.enginePower *= 0.9;
  }

  shoot() {
    this.bullets.push(new Bullet(
      this.ctx,
      this.x,
      this.y - this.height/2,
      0,
      -10,
      this.damage,
      'player',
      '#ff0055'
    ));
  }

  takeDamage(amount) {
    if (this.invulnerable) return false;
    
    this.health -= amount;
    this.invulnerable = true;
    this.invulnerableTime = 1000; // 1 second
    
    // Screen shake effect could be triggered here
    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  draw() {
    // Draw engine trail
    this.trail.forEach(particle => {
      this.ctx.save();
      this.ctx.globalAlpha = particle.life * 0.5;
      this.ctx.fillStyle = '#00f3ff';
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
    
    // Draw ship body (futuristic triangle)
    this.ctx.save();
    
    // Blink if invulnerable
    if (this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
      this.ctx.globalAlpha = 0.5;
    }
    
    // Main body
    this.ctx.fillStyle = this.color;
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = this.color;
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.x, this.y - this.height/2);
    this.ctx.lineTo(this.x + this.width/2, this.y + this.height/2);
    this.ctx.lineTo(this.x, this.y + this.height/4);
    this.ctx.lineTo(this.x - this.width/2, this.y + this.height/2);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Cockpit
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y - 5, 8, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Engine glow
    this.ctx.fillStyle = `rgba(0, 243, 255, ${0.5 + this.enginePower * 0.5})`;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y + this.height/3, 12 + this.enginePower * 5, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
    
    // Draw bullets
    this.bullets.forEach(bullet => bullet.draw());
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