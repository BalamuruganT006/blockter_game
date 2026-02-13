// src/game/engine/Collision.js
export class Collision {
  // Axis-Aligned Bounding Box (AABB) collision
  static check(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  // Circle collision (for more precise hit detection)
  static checkCircle(circle1, circle2) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < circle1.radius + circle2.radius;
  }

  // Point in rectangle
  static pointInRect(point, rect) {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  // Get distance between two points
  static distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  // Predictive collision (for fast moving objects)
  static checkSweep(rect1, rect2, velocity) {
    // Expand rect2 by velocity of rect1
    const expandedRect = {
      x: rect2.x - Math.abs(velocity.x),
      y: rect2.y - Math.abs(velocity.y),
      width: rect2.width + Math.abs(velocity.x) * 2,
      height: rect2.height + Math.abs(velocity.y) * 2
    };
    
    return this.check(rect1, expandedRect);
  }
}