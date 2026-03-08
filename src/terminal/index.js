import blessed from 'blessed';
import { Game } from '../core/Game.js';
import { TILE, COLORS } from '../core/Constants.js';

const game = new Game();

// Create screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'Dungeon Escape',
  fullUnicode: true,
});

// === LAYOUT ===

// Map viewport
const mapBox = blessed.box({
  top: 0,
  left: 0,
  width: '75%',
  height: '75%',
  border: { type: 'line' },
  style: {
    border: { fg: 'gray' },
    bg: 'black',
  },
  tags: true,
  label: ' Dungeon Escape ',
});

// Stats panel
const statsBox = blessed.box({
  top: 0,
  right: 0,
  width: '25%',
  height: '40%',
  border: { type: 'line' },
  style: {
    border: { fg: 'gray' },
    bg: 'black',
    fg: 'white',
  },
  tags: true,
  label: ' Stats ',
});

// Minimap
const minimapBox = blessed.box({
  top: '40%',
  right: 0,
  width: '25%',
  height: '35%',
  border: { type: 'line' },
  style: {
    border: { fg: 'gray' },
    bg: 'black',
  },
  tags: true,
  label: ' Minimap ',
});

// Message log
const logBox = blessed.box({
  bottom: 0,
  left: 0,
  width: '100%',
  height: '25%',
  border: { type: 'line' },
  style: {
    border: { fg: 'gray' },
    bg: 'black',
    fg: 'white',
  },
  tags: true,
  label: ' Log ',
  scrollable: true,
});

screen.append(mapBox);
screen.append(statsBox);
screen.append(minimapBox);
screen.append(logBox);

// === TITLE SCREEN ===
const titleBox = blessed.box({
  top: 'center',
  left: 'center',
  width: 60,
  height: 22,
  border: { type: 'line' },
  style: {
    border: { fg: 'yellow' },
    bg: 'black',
    fg: 'white',
  },
  tags: true,
  content: `{center}{bold}{yellow-fg}
 ____
|    \\ _ _ ___ ___ ___ ___ ___
|  |  | | |   | . | -_| . |   |
|____/|___|_|_|_  |___|___|_|_|
              |___|

 _____
|   __|___ ___ ___ ___ ___
|   __|_ -|  _| .'| . | -_|
|_____|___|___|__,|  _|___|
                  |_|
{/yellow-fg}{/bold}

{white-fg}A roguelike dungeon crawler{/white-fg}

{green-fg}[ENTER]{/green-fg} New Game    {red-fg}[Q]{/red-fg} Quit

{gray-fg}WASD/Arrows: Move  |  G: Pickup  |  I: Inventory
>: Descend stairs  |  .: Wait    |  Q: Quit{/gray-fg}
{/center}`,
});
screen.append(titleBox);

// === COMBAT OVERLAY ===
const combatBox = blessed.box({
  top: 'center',
  left: 'center',
  width: 44,
  height: 14,
  border: { type: 'line' },
  style: {
    border: { fg: 'red' },
    bg: 'black',
    fg: 'white',
  },
  tags: true,
  hidden: true,
  label: ' COMBAT ',
});
screen.append(combatBox);

// === INVENTORY OVERLAY ===
const inventoryBox = blessed.box({
  top: 'center',
  left: 'center',
  width: 50,
  height: 20,
  border: { type: 'line' },
  style: {
    border: { fg: 'cyan' },
    bg: 'black',
    fg: 'white',
  },
  tags: true,
  hidden: true,
  label: ' Inventory ',
});
screen.append(inventoryBox);

// === GAME OVER OVERLAY ===
const gameOverBox = blessed.box({
  top: 'center',
  left: 'center',
  width: 50,
  height: 16,
  border: { type: 'line' },
  style: {
    border: { fg: 'red' },
    bg: 'black',
    fg: 'white',
  },
  tags: true,
  hidden: true,
});
screen.append(gameOverBox);

// === RENDERING ===

function tileColor(tile) {
  switch (tile) {
    case TILE.WALL: return 'gray';
    case TILE.FLOOR: return 'white';
    case TILE.DOOR: return 'yellow';
    case TILE.STAIRS_DOWN: return 'cyan';
    case TILE.STAIRS_UP: return 'cyan';
    default: return 'white';
  }
}

function renderMap(gs) {
  const floor = gs.floor;
  const player = gs.player;
  const viewWidth = mapBox.width - 2;
  const viewHeight = mapBox.height - 2;

  // Center viewport on player
  const offsetX = Math.max(0, Math.min(floor.width - viewWidth, player.x - Math.floor(viewWidth / 2)));
  const offsetY = Math.max(0, Math.min(floor.height - viewHeight, player.y - Math.floor(viewHeight / 2)));

  let content = '';
  for (let vy = 0; vy < viewHeight; vy++) {
    let line = '';
    for (let vx = 0; vx < viewWidth; vx++) {
      const x = offsetX + vx;
      const y = offsetY + vy;

      if (x >= floor.width || y >= floor.height) {
        line += ' ';
        continue;
      }

      // Player
      if (x === player.x && y === player.y) {
        line += `{bold}{white-fg}@{/white-fg}{/bold}`;
        continue;
      }

      if (floor.visible[y][x]) {
        // Check for monster
        const monster = floor.getMonsterAt(x, y);
        if (monster) {
          const mColor = blessedColor(monster.color);
          line += `{bold}{${mColor}-fg}${monster.char}{/${mColor}-fg}{/bold}`;
          continue;
        }

        // Check for item
        const items = floor.getItemsAt(x, y);
        if (items.length > 0) {
          const iColor = blessedColor(items[0].color);
          line += `{${iColor}-fg}${items[0].char}{/${iColor}-fg}`;
          continue;
        }

        // Tile
        const tile = floor.getTile(x, y);
        const tc = tileColor(tile);
        line += `{${tc}-fg}${tile}{/${tc}-fg}`;
      } else if (floor.explored[y][x]) {
        const tile = floor.getTile(x, y);
        line += `{black-fg}${tile}{/black-fg}`;
      } else {
        line += ' ';
      }
    }
    content += line + '\n';
  }

  mapBox.setContent(content);
}

function blessedColor(hex) {
  // Map hex colors to blessed named colors
  if (hex.includes('ff') && hex.includes('44') && !hex.includes('00')) return 'red';
  if (hex.includes('cc22') || hex === '#cc2222') return 'red';
  if (hex.includes('ff44') || hex === '#ff4400') return 'red';
  if (hex.includes('22aa22') || hex.includes('44cc44') || hex.includes('00aa')) return 'green';
  if (hex.includes('228822')) return 'green';
  if (hex.includes('8844aa') || hex.includes('cc44ff')) return 'magenta';
  if (hex.includes('aa66') || hex.includes('8866')) return 'yellow';
  if (hex.includes('cccc')) return 'white';
  if (hex.includes('6688')) return 'green';
  if (hex.includes('ffcc') || hex.includes('ffaa')) return 'yellow';
  if (hex.includes('4444ff') || hex.includes('0044')) return 'blue';
  if (hex.includes('886644')) return 'yellow';
  return 'white';
}

function renderStats(gs) {
  const p = gs.player;
  const hpPct = p.hp / p.maxHp;
  const mpPct = p.mp / p.maxMp;
  const xpPct = p.xp / p.xpToNext;

  const hpBar = makeBar(hpPct, 18, 'red');
  const mpBar = makeBar(mpPct, 18, 'blue');
  const xpBar = makeBar(xpPct, 18, 'green');

  let weaponStr = p.weapon ? p.weapon.name : 'Fists';
  let armorStr = p.armor ? p.armor.name : 'None';

  const content = `
 {bold}${p.name}{/bold}  Lv.${p.level}

 HP: ${p.hp}/${p.maxHp}
 ${hpBar}

 MP: ${p.mp}/${p.maxMp}
 ${mpBar}

 XP: ${p.xp}/${p.xpToNext}
 ${xpBar}

 ATK: {yellow-fg}${p.attack}{/yellow-fg}  DEF: {cyan-fg}${p.defense}{/cyan-fg}
 Floor: {white-fg}${gs.floorLevel}{/white-fg}
 Turns: ${p.turnsPlayed}
 Kills: ${p.monstersKilled}

 {gray-fg}Wpn:{/gray-fg} ${weaponStr}
 {gray-fg}Arm:{/gray-fg} ${armorStr}`;

  statsBox.setContent(content);
}

function makeBar(pct, width, color) {
  const filled = Math.round(pct * width);
  const empty = width - filled;
  return `{${color}-fg}${'█'.repeat(filled)}{/${color}-fg}{gray-fg}${'░'.repeat(empty)}{/gray-fg}`;
}

function renderMinimap(gs) {
  const floor = gs.floor;
  const scale = 2;
  const mw = Math.floor(floor.width / scale);
  const mh = Math.floor(floor.height / scale);
  const maxW = minimapBox.width - 2;
  const maxH = minimapBox.height - 2;

  let content = '';
  for (let my = 0; my < Math.min(mh, maxH); my++) {
    let line = '';
    for (let mx = 0; mx < Math.min(mw, maxW); mx++) {
      const x = mx * scale;
      const y = my * scale;

      if (x === Math.floor(gs.player.x / scale) * scale && y === Math.floor(gs.player.y / scale) * scale) {
        line += '{white-fg}@{/white-fg}';
      } else if (floor.explored[y] && floor.explored[y][x]) {
        const tile = floor.getTile(x, y);
        if (tile === TILE.WALL) {
          line += '{gray-fg}#{/gray-fg}';
        } else if (tile === TILE.STAIRS_DOWN) {
          line += '{cyan-fg}>{/cyan-fg}';
        } else {
          line += '{black-fg}.{/black-fg}';
        }
      } else {
        line += ' ';
      }
    }
    content += line + '\n';
  }
  minimapBox.setContent(content);
}

function renderLog(gs) {
  const messages = gs.log;
  let content = '';
  for (const msg of messages) {
    const color = blessedColor(msg.color);
    content += ` {${color}-fg}> ${msg.text}{/${color}-fg}\n`;
  }
  logBox.setContent(content);
}

function renderCombat(gs) {
  const monster = gs.combat.monster;
  const mHpPct = monster.hp / monster.maxHp;
  const mHpBar = makeBar(mHpPct, 20, 'red');
  const mColor = blessedColor(monster.color);

  combatBox.setContent(`
  {bold}{${mColor}-fg}${monster.char}{/${mColor}-fg} ${monster.name}{/bold}
  HP: ${monster.hp}/${monster.maxHp}
  ${mHpBar}

  ATK: ${monster.attack}  DEF: ${monster.defense}

  {yellow-fg}[A]{/yellow-fg} Attack   {blue-fg}[D]{/blue-fg} Defend
  {green-fg}[F]{/green-fg} Flee     {magenta-fg}[P]{/magenta-fg} Use Potion
`);
  combatBox.show();
}

function renderInventory(gs) {
  const p = gs.player;
  let content = '\n';

  if (p.inventory.length === 0) {
    content += '  {gray-fg}(empty){/gray-fg}\n';
  } else {
    for (let i = 0; i < p.inventory.length; i++) {
      const item = p.inventory[i];
      const selected = i === gs.selectedInventoryIndex;
      const prefix = selected ? '{bold}{yellow-fg}> ' : '  {gray-fg}';
      const suffix = selected ? '{/yellow-fg}{/bold}' : '{/gray-fg}';
      const iColor = blessedColor(item.color);
      let stats = '';
      if (item.type === 'weapon') stats = ` (ATK +${item.attack})`;
      if (item.type === 'armor') stats = ` (DEF +${item.defense})`;
      if (item.effect === 'heal') stats = ` (+${item.value} HP)`;
      if (item.effect === 'mana') stats = ` (+${item.value} MP)`;
      content += `${prefix}{${iColor}-fg}${item.char}{/${iColor}-fg} ${item.name}${stats}${suffix}\n`;
    }
  }

  content += '\n  {green-fg}[E]{/green-fg} Equip/Use  {red-fg}[D]{/red-fg} Drop  {white-fg}[I/ESC]{/white-fg} Close';
  content += '\n  {gray-fg}↑/↓ to select{/gray-fg}';

  inventoryBox.setContent(content);
  inventoryBox.show();
}

function renderGameOver(gs) {
  const p = gs.player;
  const isVictory = gs.state === 'victory';
  const borderColor = isVictory ? 'yellow' : 'red';
  gameOverBox.style.border.fg = borderColor;

  gameOverBox.setContent(`{center}
{bold}${isVictory ? '{yellow-fg}VICTORY!' : '{red-fg}GAME OVER'}{/bold}

${isVictory ? 'You escaped the dungeon!' : 'You have been slain...'}

{white-fg}Level: ${p.level}
Floor reached: ${gs.floorLevel}
Monsters slain: ${p.monstersKilled}
Turns survived: ${p.turnsPlayed}{/white-fg}

{green-fg}[ENTER]{/green-fg} New Game    {red-fg}[Q]{/red-fg} Quit
{/center}`);
  gameOverBox.show();
}

function render() {
  const gs = game.getState();

  titleBox.hide();
  combatBox.hide();
  inventoryBox.hide();
  gameOverBox.hide();

  if (gs.state === 'title') {
    titleBox.show();
  } else if (gs.state === 'gameover' || gs.state === 'victory') {
    renderMap(gs);
    renderStats(gs);
    renderMinimap(gs);
    renderLog(gs);
    renderGameOver(gs);
  } else {
    renderMap(gs);
    renderStats(gs);
    renderMinimap(gs);
    renderLog(gs);

    if (gs.state === 'combat') {
      renderCombat(gs);
    } else if (gs.state === 'inventory') {
      renderInventory(gs);
    }
  }

  screen.render();
}

// === INPUT ===

screen.key(['q', 'C-c'], () => {
  process.exit(0);
});

screen.key(['enter', 'return'], () => {
  const gs = game.getState();
  if (gs.state === 'title' || gs.state === 'gameover' || gs.state === 'victory') {
    game.handleCommand({ type: 'newgame' });
    render();
  }
});

screen.key(['up', 'w'], () => {
  const gs = game.getState();
  if (gs.state === 'playing') {
    game.handleCommand({ type: 'move', dx: 0, dy: -1 });
  } else if (gs.state === 'inventory') {
    game.handleCommand({ type: 'select_up' });
  }
  render();
});

screen.key(['down', 's'], () => {
  const gs = game.getState();
  if (gs.state === 'playing') {
    game.handleCommand({ type: 'move', dx: 0, dy: 1 });
  } else if (gs.state === 'inventory') {
    game.handleCommand({ type: 'select_down' });
  }
  render();
});

screen.key(['left', 'a'], () => {
  const gs = game.getState();
  if (gs.state === 'playing') {
    game.handleCommand({ type: 'move', dx: -1, dy: 0 });
  }
  render();
});

screen.key(['right', 'd'], () => {
  const gs = game.getState();
  if (gs.state === 'playing') {
    game.handleCommand({ type: 'move', dx: 1, dy: 0 });
  } else if (gs.state === 'combat') {
    game.handleCommand({ type: 'defend' });
  }
  render();
});

screen.key(['g'], () => {
  const gs = game.getState();
  if (gs.state === 'playing') {
    game.handleCommand({ type: 'pickup' });
  }
  render();
});

screen.key(['>','.'], () => {
  const gs = game.getState();
  if (gs.state === 'playing') {
    // '>' for descend, '.' for wait
    game.handleCommand({ type: 'descend' });
  }
  render();
});

screen.key(['space'], () => {
  const gs = game.getState();
  if (gs.state === 'playing') {
    game.handleCommand({ type: 'wait' });
  }
  render();
});

screen.key(['i'], () => {
  const gs = game.getState();
  if (gs.state === 'playing' || gs.state === 'inventory') {
    game.handleCommand({ type: 'inventory' });
  }
  render();
});

screen.key(['escape'], () => {
  const gs = game.getState();
  if (gs.state === 'inventory') {
    game.handleCommand({ type: 'close' });
  }
  render();
});

// Combat keys (only in blessed, 'a' for attack conflicts with movement)
screen.on('keypress', (ch) => {
  const gs = game.getState();
  if (gs.state === 'combat') {
    if (ch === 'a' || ch === 'A') {
      game.handleCommand({ type: 'attack' });
      render();
    } else if (ch === 'f' || ch === 'F') {
      game.handleCommand({ type: 'flee' });
      render();
    } else if (ch === 'p' || ch === 'P') {
      // Use first potion in inventory
      const idx = gs.player.inventory.findIndex(i => i.type === 'potion');
      if (idx >= 0) {
        game.handleCommand({ type: 'useItem', index: idx });
      }
      render();
    }
  }
  // Inventory use/equip
  if (gs.state === 'inventory') {
    if (ch === 'e' || ch === 'E') {
      game.handleCommand({ type: 'use' });
      render();
    }
  }
});

// Initial render
render();
