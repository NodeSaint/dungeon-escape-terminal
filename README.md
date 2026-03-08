# Dungeon Escape

A roguelike dungeon crawler with randomly generated rooms, ASCII monsters, and turn-based combat. Playable in the terminal or browser.

```
 ____
|    \ _ _ ___ ___ ___ ___ ___
|  |  | | |   | . | -_| . |   |
|____/|___|_|_|_  |___|___|_|_|
              |___|
 _____
|   __|___ ___ ___ ___ ___
|   __|_ -|  _| .'| . | -_|
|_____|___|___|__,|  _|___|
                  |_|
```

## Play Now

**Browser:** [Play on GitHub Pages](https://nodesaint.github.io/dungeon-escape-terminal/)

**Terminal:**
```bash
git clone https://github.com/NodeSaint/dungeon-escape-terminal.git
cd dungeon-escape-terminal
npm install
npm start
```

## Features

- **Procedural dungeons** — randomly generated rooms and corridors every run
- **10 floors** of increasing difficulty — reach the bottom to escape
- **11 monster types** — rats, skeletons, orcs, demons, dragons...
- **Turn-based combat** — attack, defend, flee, or use items
- **Items & equipment** — weapons, armor, potions, scrolls
- **Fog of war** — line-of-sight visibility with explored map memory
- **Minimap** — track your exploration progress
- **Permadeath** — die and start over, true roguelike style
- **Level up** — gain XP, increase stats, grow stronger

## Controls

| Key | Action |
|-----|--------|
| `WASD` / Arrow Keys | Move |
| `G` | Pick up item |
| `I` | Open/close inventory |
| `>` or `.` | Descend stairs |
| `Space` | Wait a turn |
| `Q` | Quit (terminal) |

### Combat
| Key | Action |
|-----|--------|
| `A` | Attack |
| `D` | Defend (halves damage) |
| `F` | Flee (50%+ chance) |
| `P` | Use potion |

### Inventory
| Key | Action |
|-----|--------|
| `↑/↓` | Select item |
| `E` / `Enter` | Use/Equip |
| `X` / `D` | Drop |
| `I` / `ESC` | Close |

## Monster Bestiary

| Char | Monster | First Appears |
|------|---------|---------------|
| `r` | Rat | Floor 1 |
| `b` | Bat | Floor 1 |
| `S` | Snake | Floor 1 |
| `s` | Skeleton | Floor 2 |
| `g` | Goblin | Floor 2 |
| `z` | Zombie | Floor 3 |
| `o` | Orc | Floor 3 |
| `W` | Wraith | Floor 4 |
| `T` | Troll | Floor 5 |
| `D` | Demon | Floor 6 |
| `D` | Dragon | Floor 8 |

## Legend

| Symbol | Meaning |
|--------|---------|
| `@` | You |
| `#` | Wall |
| `.` | Floor |
| `+` | Door |
| `>` | Stairs down |
| `<` | Stairs up |
| `!` | Potion |
| `)` | Weapon |
| `[` | Armor |
| `?` | Scroll |

## Architecture

```
src/
  core/           # Shared game engine (pure JS, no I/O dependencies)
    Game.js        # Central game controller
    DungeonGenerator.js  # Procedural level generation (rot-js)
    Floor.js       # Tile map + entity management
    Player.js      # Player stats, inventory, leveling
    Monster.js     # Monster AI and behavior
    Combat.js      # Turn-based combat system
    MessageLog.js  # Event logging
    Constants.js   # Game balance, item/monster definitions

  terminal/        # Node.js terminal renderer (blessed)
    index.js       # Terminal UI with viewport, stats, minimap, log

docs/              # Browser version (GitHub Pages)
  index.html       # Game page
  css/style.css    # Terminal-aesthetic styling
  js/main.js       # Self-contained web version with canvas renderer
```

## Tech Stack

- **Core:** Pure JavaScript ES modules + [rot-js](https://ondras.github.io/rot.js/hp/) for dungeon generation & FOV
- **Terminal:** [blessed](https://github.com/chjj/blessed) for terminal UI
- **Web:** Canvas API + vanilla JS, zero build step

## GitHub Pages Setup

1. Go to repo Settings → Pages
2. Set source to "Deploy from branch"
3. Select `main` branch, `/docs` folder
4. Save — your game will be live at `https://yourusername.github.io/dungeon-escape-terminal/`

## License

MIT
