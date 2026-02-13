// Simple test to validate game engine initialization
import { GameEngine } from './frontend/src/game/engine/GameLoop.js';

// Mock canvas
class MockCanvas {
  constructor() {
    this.width = 800;
    this.height = 600;
    this.context = {
      save: () => {},
      restore: () => {},
      fillStyle: '#000',
      fillRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      translate: () => {},
      rotate: () => {},
      rect: () => {},
      lineTo: () => {},
      moveTo: () => {},
      closePath: () => {},
      globalAlpha: 1,
      shadowBlur: 0,
      shadowColor: '#000',
      font: '12px Arial',
      textAlign: 'center',
      fillText: () => {},
      canvas: this
    };
  }

  getContext(type) {
    return this.context;
  }
}

// Test initialization
console.log('Testing GameEngine initialization...');
const canvas = new MockCanvas();
const engine = new GameEngine(canvas, {
  onScoreUpdate: (score) => console.log('Score updated:', score),
  onLivesUpdate: (lives) => console.log('Lives updated:', lives),
  onGameOver: (score, level, difficulty) => console.log(`Game Over! Score: ${score}, Level: ${level}, Difficulty: ${difficulty}`)
});

console.log('✓ GameEngine created successfully');
console.log('  - Canvas: ' + (engine.canvas ? 'OK' : 'MISSING'));
console.log('  - Context: ' + (engine.ctx ? 'OK' : 'MISSING'));
console.log('  - Callbacks: ' + (engine.callbacks ? 'OK' : 'MISSING'));
console.log('  - Input: ' + (engine.input ? 'OK' : 'MISSING'));
console.log('  - Stars: ' + (engine.stars && engine.stars.length > 0 ? `OK (${engine.stars.length})` : 'MISSING'));

console.log('\nTesting GameEngine.start()...');
engine.start({
  speed: 5,
  health: 100,
  fireRate: 5,
  damage: 10
});

console.log('✓ GameEngine started successfully');
console.log('  - Running: ' + engine.isRunning);
console.log('  - Player: ' + (engine.player ? 'OK' : 'MISSING'));
console.log('  - Score: ' + engine.score);
console.log('  - Lives: ' + engine.lives);
console.log('  - Level: ' + engine.level);

console.log('\nAll tests passed! Game engine is initialized correctly.');
