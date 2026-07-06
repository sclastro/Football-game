# Pixel Pitch — 3D Pixel-Art Football

A single-player, browser-based 3D football game with low-poly / voxel-style
characters and physics-driven movement. Built to deploy as a static site on
Vercel.

## Stack

- **Vite + React + TypeScript** — lean static SPA, zero server needed
- **Three.js** via **@react-three/fiber** — 3D scene
- **@react-three/rapier** — real physics (ball bounce/roll, player collisions)
- **zustand** — match state (score, clock, teams)
- **Tailwind CSS v4** — HUD / scoreboard overlays

The whole game runs client-side in the browser; there is no backend.

## Controls

- **WASD / Arrow keys** — move
- **Hold Shift** — sprint
- **Hold Space, release** — shoot (longer hold = more power)

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build & deploy

```bash
npm run build    # outputs static site to dist/
npm run preview  # serve the production build locally
```

Deploys to Vercel with zero config — Vercel auto-detects Vite
(build `vite build`, output `dist/`). Just import the repo.

## Project layout

```
src/
  main.tsx, App.tsx           app entry
  components/
    canvas/                   GameShell, GameCanvas (R3F <Canvas>)
    ui/                       HUD, Scoreboard + GOAL! flash
  game/
    entities/                 Field, Ball, PlayerEntity, Stadium
    systems/                  input, player controller, camera,
                              ball possession (shoot), match clock
    physics/                  tuning constants
    state/                    zustand store + types
    data/                     national-team data
```

## Status

- Movement: kinematic character controller with accel/decel + smooth turning
- Ball: dynamic Rapier body; dribble by running into it, charge-and-release shot
- Atmosphere: tiered stands + instanced crowd, scoreboard with countdown
- Next up: AI teammates/opponents, goal detection, substitutions
