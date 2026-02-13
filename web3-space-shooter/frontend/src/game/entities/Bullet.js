// src/game/entities/Bullet.js
export class Bullet {
  constructor(ctx, x, y, velocityX, velocityY, damage, owner, color) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.damage = damage;
    this.owner = owner; // 'player' or 'enemy'
    this.color = color;
    
    this.width = 6;
    this.height = 15;
    this.active = true;
    this.trail = [];
  }

  update() {
    // Store trail
    this.trail.push({ x: this.x, y: this.y, life: 1.0 });
    
    // Update position
    this.x += this.velocityX;
    this.y += this.velocityY;
    
    // Update trail
    this.trail = this.trail.filter(point => {
      point.life -= 0.1;
      return point.life > 0;
    });
    
    // Check bounds
    if (this.x < 0 || this.x > this.ctx.canvas.width || 
        this.y < 0 || this.y > this.ctx.canvas.height) {
      this.active = false;
    }
  }

  draw() {
    // Draw trail
    this.trail.forEach((point, index) => {
      this.ctx.save();
      this.ctx.globalAlpha = point.life * 0.5;
      this.ctx.fillStyle = this.color;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, this.width/2 * point.life, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
    
    // Draw bullet
    this.ctx.save();
    this.ctx.fillStyle = this.color;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = this.color;
    
    // Rotate based on velocity
    const angle = Math.atan2(this.velocityY, this.velocityX);
    this.ctx.translate(this.x, this.y);
    this.ctx.rotate(angle);
    
    this.ctx.beginPath();
    this.ctx.rect(-this.width/2, -this.height/2, this.width, this.height);
    this.ctx.fill();
    
    // Core
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.rect(-this.width/4, -this.height/4, this.width/2, this.height/2);
    this.ctx.fill();
    
    this.ctx.restore();
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