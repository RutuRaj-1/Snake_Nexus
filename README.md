# SNAKE NEXUS
### *Grow. Battle. Conquer Every Dimension.*

**Snake Nexus** is an advanced HTML5 game that pairs classic 2D Snake mechanics with real-time multiplayer combat and an innovative 3D Cube Conquest tournament. Built with **Phaser 3**, **Three.js**, **Node.js**, **Express**, and **Socket.IO**.

---

## 1. Game Modes Overview

1. **Classic Snake (Mode 01)**
   - Standard single-player Snake fulfilling all academic baseline requirements.
   - 4-direction movement (Arrow keys & WASD), prevention of 180° reversals, fixed grid stepping.
   - Fair random food spawning (never spawns on snake).
   - Dynamic difficulty scaling: speed increases as the snake grows.
   - Score & all-time best score persistence via `localStorage`.
   - Start screen, pause overlay (Space), and game-over dialog with instant restart (R).

2. **2D Battle Arena (Mode 02)**
   - 4-player combat in a single shared arena.
   - Distinguishable color schemes (Cyan, Magenta, Lime, Gold) and live ranking HUD.
   - **Size-based combat rules**:
     - *Head-to-head collision*: Longer snake survives and gains an elimination bonus (+50 pts, +1 growth); shorter snake is eliminated.
     - *Equal-size collision*: Both snakes are eliminated simultaneously (Draw).
     - *Head-to-body collision*: The snake hitting another snake's body is eliminated; the body-owner survives.
     - *Self & Wall collision*: Lethal elimination.
   - **Local 4-Player Keyboards**: Player 1 (Arrows), Player 2 (WASD), Player 3 (IJKL), Player 4 (TFGH).
   - **Online Multiplayer**: Real-time authoritative server synchronization with room codes and bot-filling.
   - **Optional Portal Gates**: Paired cyber portals on arena edges for tactical warping.

3. **3D Cube Conquest (Mode 03)**
   - Genuine 3D cube rendered in **Three.js** with 6 connected playable grid faces:
     - `FRONT` (Front Citadel, +Z)
     - `BACK` (Back Fortress, -Z)
     - `LEFT` (Left Bastion, -X)
     - `RIGHT` (Right Redoubt, +X)
     - `TOP` (Apex Zenith, +Y)
     - `BOTTOM` (Chasm Nadir, -Y)
   - Capacity for **24 maximum players** (4 players assigned per face).
   - **Stage 1 (Face Qualifications)**: 4 players per face battle independently. Lethal face perimeters. Once only 1 survivor remains, they become the **Face Champion**, and that face's gateway opens.
   - **Stage 2 (Cube Final)**: The 6 champions enter the final arena. Snakes can now traverse across connected 3D edges!
   - **Interactive 3D Camera**: Free orbital mouse-drag rotation, face focus buttons (Front, Back, Left, Right, Top, Bottom, Center View), and auto-rotation toggle.
   - The last surviving champion is crowned **Cube Conqueror** with full tournament metrics (face transitions, kills, food harvested, final score).

---

## 2. Technology Stack & Architecture

- **2D Framework**: [Phaser 3](https://phaser.io/) (Classic Snake & 2D Battle Arena)
- **3D Renderer**: [Three.js](https://threejs.org/) (Genuine 3D Cube Conquest with dynamic `CanvasTexture` face mapping)
- **Authoritative Backend**: Node.js & Express
- **Real-Time Networking**: Socket.IO (room codes, authoritative tick loop, input validation, reconnect grace periods)
- **Bundler & Client Dev Server**: Vite
- **Testing**: Node.js built-in test runner (`node:test`, `node:assert`)

### Project Directory Structure
```
snake-game/
├── client/                     # Client application (Phaser 3 + Three.js + Vite)
│   ├── index.html              # Arcade shell & canvas containers
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.js             # Phaser game bootstrap
│       ├── styles/main.css     # Cyber-arcade neon theme
│       ├── core/               # Grid, ScoreManager
│       ├── multiplayer/        # SocketClient & InputController
│       ├── cube/               # CubeRenderer, CubeCamera, CubeFace, CubeMatchController
│       └── scenes/             # BootScene, MenuScene, ClassicScene, Battle2DScene, CubeLobbyScene
├── server/                     # Authoritative Node.js game server
│   ├── package.json
│   └── src/
│       ├── index.js            # Express & Socket.IO listener (:3000)
│       ├── matches/            # MatchManager, MatchRoom, GameLoop
│       ├── game/               # SnakeSimulation, BotAI
│       └── socket/             # Socket event handlers & input validation
├── shared/                     # Shared constants, events, rules & math
│   ├── constants.js            # Grid dimensions, speeds, colors, faces
│   ├── events.js               # Network event names
│   ├── gameRules.js            # Deterministic collision system & food spawner
│   └── cubeTopology.js         # Mathematical 3D cube edge transition model
├── test/                       # Automated test suites
│   ├── cubeTopology.test.js    # 384 discrete edge transition & reversibility checks
│   ├── collisionRules.test.js  # Size-based combat, head-to-head, wall & self tests
│   ├── loadSimulation.test.js  # 24-player 3D cube simulation stress test
│   └── socketE2E.test.js       # Real-time room creation & multiplayer lifecycle test
└── package.json                # Root scripts
```

---

## 3. Cube Face Topology & Transition Mathematics

The cube is centered at origin `(0, 0, 0)` with face normals aligned along standard Cartesian axes. Each face has an orthogonal right-handed local basis `(Right, Up, Normal)`.

When a snake's head at `(x, y)` crosses an edge of face $F$ with direction $\vec{d}$:
1. The boundary condition is detected:
   - $y < 0$: Crossing **UP**
   - $y \ge N$: Crossing **DOWN**
   - $x < 0$: Crossing **LEFT**
   - $x \ge N$: Crossing **RIGHT**
2. The adjacent target face $F'$ is identified.
3. Coordinates and movement direction are transformed so that position is continuous across the 3D edge:
   - `FRONT UP` $\to$ `TOP`, $(x', y') = (x, N-1)$, $\vec{d}' = \text{UP}$
   - `BACK UP` $\to$ `TOP`, $(x', y') = (N - 1 - x, 0)$, $\vec{d}' = \text{DOWN}$
   - `LEFT UP` $\to$ `TOP`, $(x', y') = (0, x)$, $\vec{d}' = \text{RIGHT}$
   - `RIGHT UP` $\to$ `TOP`, $(x', y') = (N - 1, N - 1 - x)$, $\vec{d}' = \text{LEFT}$
   - `TOP UP` $\to$ `BACK`, $(x', y') = (N - 1 - x, 0)$, $\vec{d}' = \text{DOWN}$
   - `BOTTOM UP` $\to$ `FRONT`, $(x', y') = (x, N-1)$, $\vec{d}' = \text{UP}$
4. **Mathematical Involution Property**:
   All 24 directed edge transitions satisfy exact continuous symmetry:
   $$\text{transition}(\text{transition}(\text{pos}, \vec{d}), -\vec{d}') = (\text{pos}, -\vec{d})$$
   This guarantees that immediately reversing direction returns the snake to the exact prior cell without coordinate drift or teleportation artifacts.

---

## 4. Installation & Launch Instructions

### Prerequisites
- Node.js v18 or higher (tested on Node v22)
- npm v9 or higher

### Installation Commands
Run from the root directory:
```bash
npm install
npm --prefix server install
npm --prefix client install
```

### Running the Application
Start both the authoritative server and client dev server concurrently:
```bash
npm run dev
```
- **Client**: [http://localhost:5173](http://localhost:5173)
- **Authoritative Server**: [http://localhost:3000](http://localhost:3000)

Alternatively, you can run them in separate terminals:
```bash
# Terminal 1 - Server:
npm run server

# Terminal 2 - Client:
npm run client
```

### Running Automated Tests
```bash
npm test
```
All 10 test suites (Cube Topology, Size-Based Collision Rules, 24-Player Load Stress Simulation, and Socket.IO E2E) will execute.

### Testing Multiplayer with Multiple Browsers
1. Open [http://localhost:5173](http://localhost:5173) in your primary browser.
2. Click **2D Battle Arena** $\to$ **Online Multiplayer Room** $\to$ **Create New Match Room**.
3. Note the 5-letter **ROOM CODE** (e.g. `ABC12`).
4. Open an Incognito window or second browser tab at [http://localhost:5173](http://localhost:5173).
5. Click **2D Battle Arena** $\to$ **Online Multiplayer Room** $\to$ enter room code $\to$ click **Join**.
6. Both pilots can now steer their snakes simultaneously! (Or click "Fill Empty Slots with AI Bots" to fill up to 4 or 24 players).

---

## 5. Academic Requirements Compliance Checklist

| Requirement | Status | Implementation Details |
|---|:---:|---|
| Four-direction movement (Up, Down, Left, Right) | **COMPLETE** | Fixed grid increments via `DIRECTIONS` vectors. |
| Keyboard arrow controls | **COMPLETE** | Arrow keys and WASD supported; prevents browser scroll. |
| Random food placement | **COMPLETE** | `GameRules.getRandomFreeCell` algorithm. |
| Food never spawns on snake | **COMPLETE** | Excludes all occupied snake body segments. |
| Eating food increases length | **COMPLETE** | Pending growth mechanism preserves tail on consumption. |
| Score increases for food eaten | **COMPLETE** | +10 points per food item, score tracked live. |
| Wall collision ends game (Classic) | **COMPLETE** | Lethal boundary collision triggers game over. |
| Self-collision ends game | **COMPLETE** | Segment intersection triggers game over. |
| Restart option provided | **COMPLETE** | 'R' key and UI restart button resets game state cleanly. |
| Current and Best score displayed | **COMPLETE** | Top HUD display; high score persisted in `localStorage`. |
| Game-over and restart states | **COMPLETE** | Handled with state guards, pause overlay, and cleanup. |
| Prevent 180° reversals | **COMPLETE** | `GameRules.isValidDirectionChange` prevents instant reverse. |
| 2D 4-Player Battle Arena | **COMPLETE** | Local 4-keyboard sets & online Socket.IO rooms. |
| Size-based combat rules | **COMPLETE** | Longer kills shorter; equal both die; head-to-body kills hitter. |
| Paired portal gates | **COMPLETE** | Paired edge portals with direction and coordinate mapping. |
| 3D Cube with 6 playable faces | **COMPLETE** | Genuine Three.js BoxGeometry with 6 dynamic CanvasTextures. |
| 24-player capacity (4 per face) | **COMPLETE** | 6 faces $\times$ 4 slots = 24 players, with bot filling option. |
| 2-Stage Tournament | **COMPLETE** | Stage 1 Face Qualifications $\to$ Stage 2 Cube Final. |
| 3D Edge Traversal | **COMPLETE** | Continuous mathematical coordinate & direction mapping. |
| Authoritative Server | **COMPLETE** | Node.js + Socket.IO fixed simulation tick loop (110ms). |

---

## 6. Known Limitations & Future Enhancements

- **Mobile Touch Controls**: The current controls are optimized for desktop keyboards (Arrows, WASD, IJKL, TFGH). A virtual on-screen d-pad or swipe controller can be added for mobile devices.
- **Sound System**: Uses a built-in lightweight WebAudio synthesizer so it requires zero external audio files. High-definition stereo music tracks can be plugged into `BootScene`.
- **Spectator Mode**: A dedicated observer camera following the leading snake in 3D Cube mode during large tournaments.

