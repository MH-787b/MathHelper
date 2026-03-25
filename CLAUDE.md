# MathsHelp - Times Tables Practice

## Overview
A kid-friendly times tables practice website with multiple game modes and personal records tracking. Built with vanilla HTML/CSS/JS (no frameworks). Designed to be sleek, professional, and approachable for children.

## Tech Stack
- Pure HTML, CSS, JavaScript (ES modules)
- Google Fonts: Inter (text), JetBrains Mono (numbers/timers)
- localStorage for persistent records
- No build step required - serves directly as static files

## File Structure
```
index.html          - App shell with persistent header/nav
css/style.css       - Design system (custom properties, components, responsive)
js/app.js           - Router, state management, game lifecycle orchestrator
js/games.js         - GameEngine class, question generation, 5 mode implementations
js/ui.js            - View rendering, DOM updates, transitions, event binding
js/records.js       - localStorage CRUD for personal records
```

## Architecture
- **SPA with hash routing**: `#/` (home), `#/play/:mode` (setup), `#/playing/:mode` (game), `#/results`, `#/records`
- **GameEngine** communicates via callbacks (`onTick`, `onQuestion`, `onResult`, `onEnd`) and never touches the DOM
- **Timers** use `requestAnimationFrame` + `performance.now()` for accuracy
- **During gameplay**: only targeted DOM nodes update (no full re-renders, preserves input focus)
- **Router guard**: `state.inCountdown` flag prevents hashchange from interrupting game start sequence

## Animations
- **View transitions**: Fade-up on every view change
- **Home cards**: Staggered entrance (each card slides up with increasing delay)
- **Questions**: Slide-in + scale on each new question
- **Correct answer**: Green flash on game card
- **Wrong answer**: Red flash + horizontal shake on game card
- **Score/streak**: Pop animation when value changes
- **Timer**: Pulsing red text when <=10 seconds remain (Speed Round)
- **Lives**: Expand-and-fade animation when a life is lost (Mix Master)
- **Countdown**: Scale-up pulse for 3-2-1-GO overlay
- **Results**: Score reveals with scale-up, stat items stagger in
- **New record badge**: Pop-in with overshoot
- **Record rows**: Slide-in from left with stagger
- **Buttons**: Subtle lift on hover

## Game Modes
| Mode | Color | Key Mechanic |
|------|-------|-------------|
| Speed Round | coral #f97066 | 60s timer, max correct answers |
| Beat the Clock | amber #f59e0b | Per-question timer (Easy 15s / Medium 8s / Hard 4s), 20 questions |
| Marathon | teal #14b8a6 | All 12 for one table, race completion time, re-answer wrongs |
| Mix Master | indigo #818cf8 | Progressive difficulty tiers, 3 lives |
| Streak | emerald #34d399 | Endless, first wrong answer ends it |

## Design System
- **Primary**: Slate-800 (`#1e293b`), Surface: near-white (`#f8fafc`)
- **Accents**: Each mode has its own color (see table above)
- **Cards**: White bg, 1px border, 4px left-accent, subtle shadow
- **No gradients** - flat design with solid colors
- **Responsive**: Full mobile support with 5 breakpoint tiers:
  - Small phones (<375px): Compact layout, reduced font sizes, stacked buttons
  - Standard phones (375-639px): Optimised touch targets, single-column mode grid
  - Tablet (640px+): 2-column mode grid, wider inputs, 6-column table selector
  - Desktop (1024px+): Wider padding, max-width containers
  - Landscape phone (<500px height): Compressed vertical layout, horizontal answer form
- **Touch optimised**: Larger hit targets (48px+), `:active` states instead of `:hover`, disabled pull-to-refresh during gameplay, `touch-action: manipulation`
- **Notch/safe-area support**: `env(safe-area-inset-*)` padding for modern phones
- **iOS zoom prevention**: Input font sizing to prevent auto-zoom on focus

## Records Storage
localStorage key: `mathshelp_records`. Contains:
- Per-mode best scores/times keyed by config (table selection, difficulty)
- Recent games list (last 20)
- Version field for future migration

## Development
Open `index.html` in a browser. No build step needed.
For local server: `npx serve .` or `python -m http.server`

## Deployment
Hosted on GitHub Pages from https://github.com/MH-787b/MathHelper.git
