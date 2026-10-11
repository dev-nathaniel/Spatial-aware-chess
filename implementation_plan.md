# Photorealistic 3D Chess: Implementation Plan

## Goal
A browser chess game with a board and pieces that look like real objects (wood, lacquer, felt, reflections, soft shadows), full chess rules, and a strong AI opponent. Built in the empty `Spatial-aware-chess` workspace.

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Build/dev | **Vite** (vanilla JS) | Fast HMR, handles ES modules, WASM and workers |
| 3D rendering | **Three.js** (WebGL2) | PBR materials, shadows, HDRI lighting, post-processing |
| Chess rules | **chess.js** | Covers every rule: castling, en passant, promotion, 50-move rule, threefold repetition, insufficient material |
| AI | **Stockfish 16 (WASM)** in a Web Worker | Grandmaster strength with adjustable levels, and it doesn't block the UI |
| Animation | Custom tweening plus **GSAP** | Smooth piece arcs, camera moves, easing |
| UI overlay | Vanilla HTML + CSS (glassmorphism) | Move list, clocks, menus |
| Audio | Web Audio API | Wood "clack" sounds that vary with the piece and the square |

---

## 2. What Makes It Look Real

### 2.1 Pieces: Staunton design, modeled in code
- Each piece is built from a **lathe profile** (a spline revolved around an axis) traced from real **Staunton** proportions. This covers pawn, rook, bishop, queen and king.
- **Knight**: an extruded and sculpted horse-head mesh. This is the hardest piece. Fallback: load a free CC0 glTF knight if the procedural one doesn't look good enough.
- Bevelled edges, a **felt base pad** under each piece, and the bishop's mitre slit cut out with CSG.
- High-poly geometry (smooth silhouettes) using instancing and shared geometry so it stays fast.

### 2.2 Materials (PBR via `MeshPhysicalMaterial`)
- **White pieces:** boxwood with a **clearcoat** lacquer layer and subtle grain.
- **Black pieces:** ebonized rosewood, glossy clearcoat, low roughness.
- **Board:** walnut and maple inlaid squares with a framed mahogany border, engraved coordinates, and a slight micro-roughness variation.
- Textures (albedo, roughness, normal) created with the image generator and/or procedural shaders, so there are no placeholders.

### 2.3 Lighting and Rendering
- **HDRI environment map** (a warm study or library interior) for realistic reflections on the lacquer.
- Key light plus **soft PCF shadows** with contact shadows under pieces.
- **Post-processing:** SSAO (ambient occlusion in crevices), subtle bloom on specular highlights, ACES filmic tone mapping, optional **depth of field** focused on the selected piece, and an FXAA/SMAA anti-aliasing pass.
- Board placed on a table surface inside a softly blurred room environment.

### 2.4 Physical Feel
- Pieces **lift, arc and land** with a slight settle/bounce instead of sliding.
- Captured pieces are animated off the board and arranged neatly beside it.
- Hover lifts the piece slightly; the selected piece glows subtly. Legal moves are shown as soft discs etched into the squares.
- Positional click sounds, with a different pitch per piece weight.

---

## 3. Gameplay Features
- **Modes:** vs AI (Stockfish, around 8 difficulty levels) and local 2-player (pass and play).
- **Input:** click-to-move **and** drag-and-drop with raycasting.
- Full rules, including a **promotion picker** shown as 3D floating pieces.
- Check indicator (red glow under the king), checkmate/stalemate/draw detection.
- **Move history** in SAN notation, undo, new game, flip board.
- Optional **chess clocks** (bullet, blitz, rapid).
- Camera: orbit controls with limits, smooth auto-rotate to the side to move in 2P mode, and preset views (top, player, cinematic).
- Import/export via FEN and PGN.

---

## 4. Project Structure
```
Spatial-aware-chess/
├─ index.html
├─ src/
│  ├─ main.js              # bootstrap
│  ├─ styles/index.css     # design system + UI
│  ├─ scene/
│  │  ├─ renderer.js       # renderer, tone mapping, post-processing
│  │  ├─ environment.js    # HDRI, lights, table, room
│  │  ├─ board.js          # board mesh + squares + highlights
│  │  ├─ pieces/
│  │  │  ├─ profiles.js    # Staunton lathe profiles
│  │  │  ├─ knight.js      # knight geometry
│  │  │  └─ factory.js     # builds/caches piece meshes
│  │  ├─ materials.js      # PBR wood/lacquer/felt
│  │  └─ camera.js
│  ├─ game/
│  │  ├─ GameController.js # ties chess.js <-> scene
│  │  ├─ input.js          # raycast click & drag
│  │  ├─ animator.js       # move arcs, captures
│  │  └─ ai/stockfish.worker.js
│  ├─ ui/                  # HUD, move list, menus, promotion
│  └─ audio/sound.js
└─ public/
   ├─ textures/            # generated wood/board textures
   ├─ hdri/                # environment map
   └─ stockfish/           # WASM engine
```

---

## 5. Build Phases
1. **Scaffold:** Vite project, Three.js renderer, HDRI, camera, table.
2. **Board:** inlaid squares, frame, coordinates, materials.
3. **Pieces:** lathe profiles, knight, PBR materials, then tune them toward photorealism.
4. **Game logic:** chess.js integration, click/drag input, legal-move highlights.
5. **Animation and audio:** arcs, captures, settle, sounds.
6. **AI:** Stockfish worker, difficulty levels.
7. **UI:** start menu, HUD, move list, clocks, promotion, game-over modal.
8. **Polish:** post-processing, performance (adaptive quality on mobile), responsive layout, SEO metadata.
9. **Verify:** browser testing of a full game (castling, en passant, promotion, mate) with screenshots and a recording.

---

## 6. Verification Plan
- Use a browser subagent to play scripted openings, test special moves and confirm game-over states.
- Visual check of renders from several camera angles.
- Performance target: **60 fps on desktop**, adaptive quality (shadow and post-processing levels) on weaker GPUs and phones.

> [!NOTE]
> Assets: HDRI from **Poly Haven (CC0)** loaded at runtime, or bundled locally. Stockfish via the `stockfish` npm package (GPL, which is fine for a personal or open-source project).

---

## Open Questions
1. **Game modes:** is vs-AI plus local 2-player enough, or do you want **online multiplayer** (needs a backend, e.g. WebSockets)?
2. **Piece style:** classic **boxwood/ebony Staunton** (my recommendation), or something else such as marble/glass or metal?
3. **Pieces:** are you OK with the **procedural** approach (everything generated in code), or do you prefer that I use **CC0 3D model files** for maximum knight realism?
4. **"Spatial-aware"**: the folder name suggests you may want **WebXR (AR/VR)**, e.g. placing the board on your real table. Should I include that?
