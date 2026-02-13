# Web3 Space Shooter - Game System Overview

## Game Loop Architecture

### Core Components Initialized ✅
- **GameEngine**: Main game loop manager
  - Constructor initializes canvas, callbacks, input tracking, timing
  - bindMethod calls on gameLoop, handleKeyDown, handleKeyUp
  - Generates 100 parallax stars for background

### Game Lifecycle ✅
1. **GameCanvas Component** mounted
   - useRef for canvas DOM element
   - useEffect initializes GameEngine with callbacks
   - GameEngine listens for keyboard input (W/A/S/D, Space, Arrow Keys, ESC)

2. **startGame() called** on "START MISSION" button click
   - Creates Player entity at center-bottom of canvas (800x600)
   - Initializes with NFT ship stats or defaults
   - Sets isRunning=true, isGameOver=false, isPaused=false
   - Resets score=0, lives=3, level=1, difficulty=1
   - Initializes enemy spawn properties (lastSpawn, spawnRate=2000ms)
   - Calls requestAnimationFrame(this.gameLoop)

3. **gameLoop(currentTime)** runs every frame
   - Receives currentTime from requestAnimationFrame
   - Calculates deltaTime = min(currentTime - lastTime, 32ms)
   - If not paused and not game over: calls update()
   - Always calls draw()
   - Recursively calls requestAnimationFrame(this.gameLoop)

4. **update()** handles game logic
   - Updates parallax stars (moving down, repositioning at top)
   - Updates player (movement, shooting, bullet tracking)
   - Spawns enemies when spawn timer exceeded (rate increases with score)
   - Updates each enemy (movement, shooting, collision checks)
   - Checks bullet-enemy collisions → score updates, explosions
   - Checks player-enemy collisions → damage, lives update, callback
   - Checks enemy projectile-player collisions → damage, lives update
   - Updates particles (trails, explosions) with life decay
   - Updates power-ups (falling, pickup detection)
   - Calls onScoreUpdate callback with current score
   - Level progression (every 500 points = 1 level, increases difficulty)

5. **draw()** renders everything
   - Clears canvas with fade effect (enables motion trails)
   - Draws background stars with brightness variation
   - Renders player with engine trails if moving
   - Renders all enemies with type-specific visuals
   - Renders all particles (explosion effects)
   - Renders power-ups with glow effects
   - Renders UI layer (lives hearts, health bar, level display)
   - Renders pause/gameover overlay screens if active

### Entity System ✅
- **Player**: 
  - Movement (WASD/arrows), boundary checking
  - Shooting (spacebar), cooldown-based fire rate
  - Health system with invulnerability frames
  - Engine trail particles
  - Collision bounds: getBounds()
  - Render method: draw()

- **Enemy**: 
  - 5 types: basic, fast, tank, shooter, boss
  - Movement patterns (sine wave or straight down)
  - Projectile firing for some types
  - Type-specific rendering (triangles, ellipses, rectangles, circles, hexagons)
  - Health bars for tanks/bosses
  - Pulsing animation via Math.sin()
  - Collision bounds: getBounds()

- **Bullet**:
  - Ownership tracking (player vs enemy)
  - Trail effects
  - Velocity-based rotation
  - Off-screen deactivation
  - Collision bounds: getBounds()

- **Particle**:
  - Created by explosions (15 per explosion)
  - Physics: velocity, decay, size reduction
  - Life tracking (1.0 to 0.0)

### Collision System ✅
- **Collision.check()**: Axis-Aligned Bounding Box (AABB)
  - rect1.x < rect2.x + rect2.width
  - rect1.x + rect1.width > rect2.x
  - rect1.y < rect2.y + rect2.height
  - rect1.y + rect1.height > rect2.y

### Input Handling ✅
- Window event listeners for keydown/keyup
- Input object tracks pressed keys
- Player.update() reads input.keys for movement/shooting

### Callback System ✅
- onScoreUpdate(score): Called every frame with current score
- onLivesUpdate(lives): Called when health collision detected
- onGameOver(score, level, difficulty): Called when lives <= 0

### State Management ✅
- **Game State** (React): menu, playing, paused, gameover
- **Engine State**: isRunning, isPaused, isGameOver
- **Game Variables**: score, lives, level, difficulty
- **Score Scaling**: Every 500 points = 1 level
- **Difficulty**: 1 + (level - 1) * 0.2

### Visual Effects ✅
- Motion blur trails from canvas fade effect
- Neon glow on ships and projectiles
- Particle explosions on enemy destruction
- Pulsing enemy animations
- Invulnerability blinking on player damage
- Engine glow on player thrust

## Files Structure ✅
```
frontend/src/
├── components/
│   └── GameCanvas.jsx (main game UI + game loop integration)
├── game/
│   ├── engine/
│   │   ├── GameLoop.js (GameEngine class + Particle class)
│   │   └── Collision.js (collision detection)
│   └── entities/
│       ├── Player.js (player spaceship)
│       ├── Enemy.js (5 enemy types)
│       └── Bullet.js (projectiles)
├── hooks/
│   ├── useWeb3.js (MetaMask integration)
│   └── useGameContract.js (blockchain interactions)
└── styles/
    └── global.css (1809 lines of styling)
```

## Game Ready Status
✅ All core systems implemented
✅ All imports properly set up
✅ All callbacks configured
✅ Canvas rendering pipeline complete
✅ Entity spawning and collision working
✅ Score/level/lives tracking functional
✅ No syntax errors detected

## Known Limitations
- Touch controls not yet implemented (keyboard only)
- Mobile responsive not fully optimized
- Power-up mechanics functional but basic
- Sound effects not implemented
- Boss enemy difficulty not visually distinct

## Next Features (Future Enhancement)
- Mobile touch controls
- Sound effects and music
- Particle effects improvements
- More enemy patterns
- Boss battle mechanics
- Ship upgrade/customization
- Leaderboard integration
- Achievement system
