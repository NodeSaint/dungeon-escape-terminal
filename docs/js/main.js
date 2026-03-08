// Self-contained web version of Dungeon Escape
// Uses rot-js from CDN for dungeon generation and FOV

import ROT from 'https://cdn.jsdelivr.net/npm/rot-js@2.2.0/+esm';

// === CONSTANTS ===
const MAP_WIDTH = 80;
const MAP_HEIGHT = 40;
const TILE = { WALL: '#', FLOOR: '.', DOOR: '+', STAIRS_DOWN: '>', STAIRS_UP: '<', VOID: ' ' };
const FOV_RADIUS = 8;
const MONSTER_ACTIVATION_RADIUS = 12;
const MAX_INVENTORY = 15;
const MAX_FLOOR = 10;
const XP_PER_LEVEL = (level) => Math.floor(100 * Math.pow(level, 1.4));

const COLORS = {
  WALL: '#555555', FLOOR: '#333333', DOOR: '#cc8800', STAIRS: '#00cccc',
  PLAYER: '#ffffff', EXPLORED_WALL: '#222222', EXPLORED_FLOOR: '#1a1a1a',
};

const MONSTER_TYPES = {
  rat: { name: 'Rat', char: 'r', color: '#aa6622', hp: 8, attack: 2, defense: 0, xp: 5, speed: 1.2, minFloor: 1 },
  bat: { name: 'Bat', char: 'b', color: '#886644', hp: 6, attack: 3, defense: 0, xp: 4, speed: 1.5, minFloor: 1 },
  snake: { name: 'Snake', char: 'S', color: '#22aa22', hp: 12, attack: 4, defense: 1, xp: 8, speed: 1.0, minFloor: 1 },
  skeleton: { name: 'Skeleton', char: 's', color: '#cccccc', hp: 20, attack: 5, defense: 2, xp: 15, speed: 0.8, minFloor: 2 },
  goblin: { name: 'Goblin', char: 'g', color: '#00aa00', hp: 15, attack: 4, defense: 1, xp: 12, speed: 1.1, minFloor: 2 },
  zombie: { name: 'Zombie', char: 'z', color: '#668866', hp: 30, attack: 6, defense: 3, xp: 20, speed: 0.5, minFloor: 3 },
  orc: { name: 'Orc', char: 'o', color: '#44cc44', hp: 35, attack: 8, defense: 4, xp: 30, speed: 0.9, minFloor: 3 },
  wraith: { name: 'Wraith', char: 'W', color: '#8844aa', hp: 25, attack: 10, defense: 2, xp: 35, speed: 1.2, minFloor: 4 },
  troll: { name: 'Troll', char: 'T', color: '#228822', hp: 60, attack: 12, defense: 6, xp: 50, speed: 0.6, minFloor: 5 },
  demon: { name: 'Demon', char: 'D', color: '#cc2222', hp: 80, attack: 15, defense: 8, xp: 80, speed: 1.0, minFloor: 6 },
  dragon: { name: 'Dragon', char: 'D', color: '#ff4400', hp: 150, attack: 20, defense: 12, xp: 200, speed: 0.8, minFloor: 8 },
};

const ITEM_TYPES = {
  health_potion_small: { name: 'Small Health Potion', char: '!', color: '#ff4444', type: 'potion', effect: 'heal', value: 20, rarity: 1 },
  health_potion_medium: { name: 'Health Potion', char: '!', color: '#ff2222', type: 'potion', effect: 'heal', value: 50, rarity: 3 },
  health_potion_large: { name: 'Large Health Potion', char: '!', color: '#ff0000', type: 'potion', effect: 'heal', value: 100, rarity: 5 },
  mana_potion: { name: 'Mana Potion', char: '!', color: '#4444ff', type: 'potion', effect: 'mana', value: 30, rarity: 2 },
  dagger: { name: 'Dagger', char: ')', color: '#cccccc', type: 'weapon', attack: 3, rarity: 1 },
  short_sword: { name: 'Short Sword', char: ')', color: '#dddddd', type: 'weapon', attack: 5, rarity: 2 },
  long_sword: { name: 'Long Sword', char: ')', color: '#eeeeee', type: 'weapon', attack: 8, rarity: 4 },
  battle_axe: { name: 'Battle Axe', char: ')', color: '#ffaa00', type: 'weapon', attack: 11, rarity: 5 },
  war_hammer: { name: 'War Hammer', char: ')', color: '#ff6600', type: 'weapon', attack: 14, rarity: 7 },
  leather_armor: { name: 'Leather Armor', char: '[', color: '#886644', type: 'armor', defense: 2, rarity: 1 },
  chain_mail: { name: 'Chain Mail', char: '[', color: '#aaaaaa', type: 'armor', defense: 4, rarity: 3 },
  plate_armor: { name: 'Plate Armor', char: '[', color: '#ccccff', type: 'armor', defense: 7, rarity: 6 },
  scroll_reveal: { name: 'Scroll of Reveal', char: '?', color: '#ffcc00', type: 'scroll', effect: 'reveal', rarity: 4 },
  scroll_teleport: { name: 'Scroll of Teleport', char: '?', color: '#cc44ff', type: 'scroll', effect: 'teleport', rarity: 5 },
};

// === GAME CLASSES ===

class MessageLog {
  constructor() { this.messages = []; }
  add(text, color = '#cccccc') {
    this.messages.push({ text, color });
    if (this.messages.length > 100) this.messages.shift();
  }
  getRecent(n = 6) { return this.messages.slice(-n); }
  clear() { this.messages = []; }
}

class Player {
  constructor(x, y) {
    Object.assign(this, {
      x, y, char: '@', color: '#ffffff', name: 'Hero',
      level: 1, xp: 0, xpToNext: XP_PER_LEVEL(1),
      maxHp: 50, hp: 50, maxMp: 20, mp: 20,
      baseAttack: 5, baseDefense: 2,
      weapon: null, armor: null, inventory: [],
      defending: false, turnsPlayed: 0, monstersKilled: 0,
    });
  }
  get attack() { return this.baseAttack + (this.weapon ? this.weapon.attack : 0); }
  get defense() { return this.baseDefense + (this.armor ? this.armor.defense : 0); }
  get isAlive() { return this.hp > 0; }
  canPickup() { return this.inventory.length < MAX_INVENTORY; }
  addItem(item) { if (this.canPickup()) { this.inventory.push(item); return true; } return false; }
  removeItem(i) { return i >= 0 && i < this.inventory.length ? this.inventory.splice(i, 1)[0] : null; }
  takeDamage(amount) {
    const actual = this.defending ? Math.floor(amount / 2) : amount;
    this.hp = Math.max(0, this.hp - actual);
    return actual;
  }
  addXp(amount) {
    this.xp += amount;
    const levels = [];
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = XP_PER_LEVEL(this.level);
      this.maxHp += 10; this.hp = this.maxHp;
      this.maxMp += 5; this.mp = this.maxMp;
      this.baseAttack += 2; this.baseDefense += 1;
      levels.push(this.level);
    }
    return levels;
  }
  equip(item) {
    if (item.type === 'weapon') { const old = this.weapon; this.weapon = item; return old; }
    if (item.type === 'armor') { const old = this.armor; this.armor = item; return old; }
    return null;
  }
  useItem(item) {
    if (item.effect === 'heal') { const h = Math.min(item.value, this.maxHp - this.hp); this.hp += h; return { effect: 'heal', value: h }; }
    if (item.effect === 'mana') { const m = Math.min(item.value, this.maxMp - this.mp); this.mp += m; return { effect: 'mana', value: m }; }
    return { effect: item.effect, value: item.value };
  }
}

class Monster {
  constructor(type, x, y, floorLevel) {
    const scale = 1 + (floorLevel - type.minFloor) * 0.15;
    Object.assign(this, {
      id: Math.random().toString(36).substr(2, 9),
      name: type.name, char: type.char, color: type.color,
      x, y, maxHp: Math.floor(type.hp * scale), attack: Math.floor(type.attack * scale),
      defense: Math.floor(type.defense * scale), xp: Math.floor(type.xp * scale),
      speed: type.speed, state: 'idle', alertTurns: 0,
    });
    this.hp = this.maxHp;
  }
  get isAlive() { return this.hp > 0; }
  takeDamage(amount) { const a = Math.max(1, amount - this.defense); this.hp = Math.max(0, this.hp - a); return a; }
  getAction(px, py, floor) {
    const dx = px - this.x, dy = py - this.y, dist = Math.abs(dx) + Math.abs(dy);
    if (this.hp < this.maxHp * 0.2) { this.state = 'fleeing'; return this._flee(dx, dy, floor); }
    if (dist <= 6 || this.state === 'alert') {
      this.state = 'alert'; this.alertTurns = 8;
      if (dist === 1) return { type: 'attack' };
      return this._chase(dx, dy, floor);
    }
    if (this.alertTurns > 0) { this.alertTurns--; if (this.alertTurns === 0) this.state = 'idle'; }
    return this._wander(floor);
  }
  _chase(dx, dy, floor) {
    const moves = [];
    if (dx > 0) moves.push({ mx: 1, my: 0, p: Math.abs(dx) });
    if (dx < 0) moves.push({ mx: -1, my: 0, p: Math.abs(dx) });
    if (dy > 0) moves.push({ mx: 0, my: 1, p: Math.abs(dy) });
    if (dy < 0) moves.push({ mx: 0, my: -1, p: Math.abs(dy) });
    moves.sort((a, b) => b.p - a.p);
    for (const m of moves) {
      const nx = this.x + m.mx, ny = this.y + m.my;
      if (floor.isPassable(nx, ny) && !floor.getMonsterAt(nx, ny)) return { type: 'move', dx: m.mx, dy: m.my };
    }
    return { type: 'wait' };
  }
  _flee(dx, dy, floor) {
    const moves = [];
    if (dx > 0) moves.push({ mx: -1, my: 0 }); if (dx < 0) moves.push({ mx: 1, my: 0 });
    if (dy > 0) moves.push({ mx: 0, my: -1 }); if (dy < 0) moves.push({ mx: 0, my: 1 });
    for (const m of moves) {
      const nx = this.x + m.mx, ny = this.y + m.my;
      if (floor.isPassable(nx, ny) && !floor.getMonsterAt(nx, ny)) return { type: 'move', dx: m.mx, dy: m.my };
    }
    return { type: 'wait' };
  }
  _wander(floor) {
    if (Math.random() < 0.6) return { type: 'wait' };
    const dirs = [{ mx: 0, my: -1 }, { mx: 0, my: 1 }, { mx: -1, my: 0 }, { mx: 1, my: 0 }];
    const d = dirs[Math.floor(Math.random() * dirs.length)];
    const nx = this.x + d.mx, ny = this.y + d.my;
    if (floor.isPassable(nx, ny) && !floor.getMonsterAt(nx, ny)) return { type: 'move', dx: d.mx, dy: d.my };
    return { type: 'wait' };
  }
}

class Floor {
  constructor(tiles, level, rooms) {
    this.tiles = tiles; this.level = level; this.rooms = rooms;
    this.monsters = []; this.items = [];
    this.playerStartX = 0; this.playerStartY = 0;
    this.stairsDownX = 0; this.stairsDownY = 0;
    this.width = MAP_WIDTH; this.height = MAP_HEIGHT;
    this.visible = Array.from({ length: MAP_HEIGHT }, () => new Array(MAP_WIDTH).fill(false));
    this.explored = Array.from({ length: MAP_HEIGHT }, () => new Array(MAP_WIDTH).fill(false));
  }
  getTile(x, y) { return (x < 0 || x >= this.width || y < 0 || y >= this.height) ? TILE.WALL : this.tiles[y][x]; }
  isPassable(x, y) { const t = this.getTile(x, y); return t !== TILE.WALL && t !== TILE.VOID; }
  isTransparent(x, y) { return this.isPassable(x, y); }
  getMonsterAt(x, y) { return this.monsters.find(m => m.x === x && m.y === y && m.isAlive); }
  getItemsAt(x, y) { return this.items.filter(i => i.x === x && i.y === y); }
  removeItem(id) { this.items = this.items.filter(i => i.id !== id); }
  removeMonster(id) { this.monsters = this.monsters.filter(m => m.id !== id); }
  clearVisibility() { for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) this.visible[y][x] = false; }
  setVisible(x, y) { if (x >= 0 && x < this.width && y >= 0 && y < this.height) { this.visible[y][x] = true; this.explored[y][x] = true; } }
  revealAll() { for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) this.explored[y][x] = true; }
}

class Combat {
  constructor(player, monster) {
    this.player = player; this.monster = monster; this.active = true; this.messages = [];
  }
  playerAttack() {
    this.messages = []; this.player.defending = false;
    const dmg = this.monster.takeDamage(this.player.attack + Math.floor(Math.random() * 4) - 1);
    this.messages.push({ text: `You hit the ${this.monster.name} for ${dmg} damage!`, color: '#ffcc00' });
    if (!this.monster.isAlive) { this._monsterDied(); return this.messages; }
    this._monsterTurn(); return this.messages;
  }
  playerDefend() {
    this.messages = []; this.player.defending = true;
    this.messages.push({ text: 'You brace yourself!', color: '#4488ff' });
    this._monsterTurn(); return this.messages;
  }
  playerFlee() {
    this.messages = [];
    if (Math.random() < 0.5 + (this.player.level - 1) * 0.05) {
      this.messages.push({ text: 'You flee!', color: '#88ff88' }); this.active = false; return this.messages;
    }
    this.messages.push({ text: 'Failed to escape!', color: '#ff8888' });
    this._monsterTurn(); return this.messages;
  }
  _monsterTurn() {
    if (!this.monster.isAlive || !this.active) return;
    const dmg = this.player.takeDamage(this.monster.attack + Math.floor(Math.random() * 3) - 1);
    this.messages.push({ text: `The ${this.monster.name} strikes for ${dmg} damage!`, color: '#ff4444' });
    if (!this.player.isAlive) { this.messages.push({ text: 'You have been slain!', color: '#ff0000' }); this.active = false; }
  }
  _monsterDied() {
    const levels = this.player.addXp(this.monster.xp);
    this.messages.push({ text: `${this.monster.name} defeated! (+${this.monster.xp} XP)`, color: '#00ff00' });
    for (const l of levels) this.messages.push({ text: `*** LEVEL UP! Level ${l}! ***`, color: '#ffff00' });
    this.player.monstersKilled++; this.active = false;
  }
}

// === DUNGEON GENERATOR ===
function generateFloor(floorLevel) {
  const tiles = Array.from({ length: MAP_HEIGHT }, () => new Array(MAP_WIDTH).fill(TILE.WALL));
  const digger = new ROT.Map.Digger(MAP_WIDTH, MAP_HEIGHT, {
    roomWidth: [4, 9], roomHeight: [3, 6], corridorLength: [2, 8],
    dugPercentage: 0.35 + floorLevel * 0.02,
  });
  const rooms = [];
  digger.create((x, y, wall) => { if (!wall) tiles[y][x] = TILE.FLOOR; });
  for (const room of digger.getRooms()) {
    rooms.push({ x1: room.getLeft(), y1: room.getTop(), x2: room.getRight(), y2: room.getBottom(),
      cx: Math.floor((room.getLeft() + room.getRight()) / 2), cy: Math.floor((room.getTop() + room.getBottom()) / 2) });
    room.getDoors((x, y) => { if (x > 0 && x < MAP_WIDTH - 1 && y > 0 && y < MAP_HEIGHT - 1) tiles[y][x] = TILE.DOOR; });
  }
  const startRoom = rooms[0], endRoom = rooms[rooms.length - 1];
  tiles[startRoom.cy][startRoom.cx] = TILE.STAIRS_UP;
  tiles[endRoom.cy][endRoom.cx] = TILE.STAIRS_DOWN;
  const floor = new Floor(tiles, floorLevel, rooms);
  floor.playerStartX = startRoom.cx; floor.playerStartY = startRoom.cy;
  floor.stairsDownX = endRoom.cx; floor.stairsDownY = endRoom.cy;
  placeMonsters(floor, rooms.slice(1), floorLevel);
  placeItems(floor, rooms.slice(1), floorLevel);
  return floor;
}

function placeMonsters(floor, rooms, floorLevel) {
  const count = Math.floor(3 + floorLevel * 2 + Math.random() * 3);
  const eligible = Object.values(MONSTER_TYPES).filter(m => m.minFloor <= floorLevel);
  for (let i = 0; i < count && rooms.length > 0; i++) {
    const room = rooms[Math.floor(Math.random() * rooms.length)];
    const x = room.x1 + Math.floor(Math.random() * (room.x2 - room.x1 + 1));
    const y = room.y1 + Math.floor(Math.random() * (room.y2 - room.y1 + 1));
    if (floor.isPassable(x, y) && !floor.getMonsterAt(x, y)) {
      const weights = eligible.map(m => Math.max(1, floorLevel - m.minFloor + 2));
      const total = weights.reduce((a, b) => a + b, 0);
      let roll = Math.random() * total;
      let type = eligible[0];
      for (let j = 0; j < eligible.length; j++) { roll -= weights[j]; if (roll <= 0) { type = eligible[j]; break; } }
      floor.monsters.push(new Monster(type, x, y, floorLevel));
    }
  }
}

function placeItems(floor, rooms, floorLevel) {
  const count = Math.floor(2 + floorLevel * 0.8 + Math.random() * 3);
  const eligible = Object.entries(ITEM_TYPES).filter(([, v]) => v.rarity <= floorLevel + 2);
  for (let i = 0; i < count && rooms.length > 0; i++) {
    const room = rooms[Math.floor(Math.random() * rooms.length)];
    const x = room.x1 + Math.floor(Math.random() * (room.x2 - room.x1 + 1));
    const y = room.y1 + Math.floor(Math.random() * (room.y2 - room.y1 + 1));
    if (floor.isPassable(x, y)) {
      const weights = eligible.map(([, v]) => Math.max(1, floorLevel + 3 - v.rarity));
      const total = weights.reduce((a, b) => a + b, 0);
      let roll = Math.random() * total;
      let chosen = eligible[0];
      for (let j = 0; j < eligible.length; j++) { roll -= weights[j]; if (roll <= 0) { chosen = eligible[j]; break; } }
      const [key, template] = chosen;
      floor.items.push({ id: Math.random().toString(36).substr(2, 9), key, ...template, x, y });
    }
  }
}

// === GAME ===
class Game {
  constructor() {
    this.state = 'title'; this.player = null; this.floor = null;
    this.floorLevel = 0; this.combat = null; this.log = new MessageLog();
    this.selectedInventoryIndex = 0;
  }
  newGame() {
    this.player = new Player(0, 0); this.floorLevel = 1;
    this.log.clear();
    this.log.add('You descend into the dungeon...', '#aaaaff');
    this.log.add('Find the stairs (>) to go deeper. Reach floor 10 to escape!', '#aaaaff');
    this._generateFloor(); this.state = 'playing';
  }
  _generateFloor() {
    this.floor = generateFloor(this.floorLevel);
    this.player.x = this.floor.playerStartX; this.player.y = this.floor.playerStartY;
    this._computeFov();
  }
  _computeFov() {
    this.floor.clearVisibility();
    const fov = new ROT.FOV.RecursiveShadowcasting((x, y) => this.floor.isTransparent(x, y));
    fov.compute(this.player.x, this.player.y, FOV_RADIUS, (x, y) => this.floor.setVisible(x, y));
  }
  handleCommand(cmd) {
    if (this.state === 'title' || this.state === 'gameover' || this.state === 'victory') {
      if (cmd.type === 'newgame') this.newGame(); return;
    }
    if (this.state === 'inventory') { this._handleInventory(cmd); return; }
    if (this.state === 'combat') { this._handleCombat(cmd); return; }
    if (this.state === 'playing') this._handlePlaying(cmd);
  }
  _handlePlaying(cmd) {
    switch (cmd.type) {
      case 'move': {
        const nx = this.player.x + cmd.dx, ny = this.player.y + cmd.dy;
        const monster = this.floor.getMonsterAt(nx, ny);
        if (monster) { this.combat = new Combat(this.player, monster); this.state = 'combat'; this.log.add(`A ${monster.name} blocks your path!`, '#ff8844'); return; }
        if (this.floor.isPassable(nx, ny)) {
          this.player.x = nx; this.player.y = ny; this.player.turnsPlayed++;
          this._processMonsterTurns(); this._computeFov(); this._checkItemsOnGround();
        }
        break;
      }
      case 'pickup': {
        const items = this.floor.getItemsAt(this.player.x, this.player.y);
        if (!items.length) { this.log.add('Nothing here.', '#888'); }
        else for (const item of items) {
          if (this.player.addItem(item)) { this.floor.removeItem(item.id); this.log.add(`Picked up ${item.name}.`, '#88ff88'); }
          else { this.log.add('Inventory full!', '#ff8888'); break; }
        }
        break;
      }
      case 'descend': {
        if (this.player.x === this.floor.stairsDownX && this.player.y === this.floor.stairsDownY) {
          this.floorLevel++;
          if (this.floorLevel > MAX_FLOOR) { this.state = 'victory'; this.log.add('You escaped the dungeon! VICTORY!', '#ffff00'); }
          else { this.log.add(`Descending to floor ${this.floorLevel}...`, '#aaaaff'); this._generateFloor(); }
        } else this.log.add('No stairs here.', '#888');
        break;
      }
      case 'inventory': this.state = 'inventory'; this.selectedInventoryIndex = 0; break;
      case 'wait': this.player.turnsPlayed++; this._processMonsterTurns(); this._computeFov(); break;
    }
  }
  _handleCombat(cmd) {
    let msgs = [];
    switch (cmd.type) {
      case 'attack': msgs = this.combat.playerAttack(); break;
      case 'defend': msgs = this.combat.playerDefend(); break;
      case 'flee': msgs = this.combat.playerFlee(); break;
      case 'useItem': {
        if (cmd.index !== undefined && cmd.index < this.player.inventory.length) {
          const item = this.player.inventory[cmd.index];
          if (item.type === 'potion') {
            const r = this.player.useItem(item); this.player.removeItem(cmd.index);
            msgs = [{ text: `Used ${item.name}. ${r.effect === 'heal' ? '+' + r.value + ' HP' : '+' + r.value + ' MP'}!`, color: '#88ff88' }];
            if (this.combat.active) { this.combat._monsterTurn(); msgs = msgs.concat(this.combat.messages); }
          } else msgs = [{ text: "Can't use that in combat!", color: '#ff8888' }];
        }
        break;
      }
    }
    for (const m of msgs) this.log.add(m.text, m.color);
    if (!this.combat.active) {
      if (!this.player.isAlive) this.state = 'gameover';
      else { if (!this.combat.monster.isAlive) this.floor.removeMonster(this.combat.monster.id); this.combat = null; this.state = 'playing'; }
    }
  }
  _handleInventory(cmd) {
    switch (cmd.type) {
      case 'close': case 'inventory': this.state = 'playing'; break;
      case 'select_up': this.selectedInventoryIndex = Math.max(0, this.selectedInventoryIndex - 1); break;
      case 'select_down': this.selectedInventoryIndex = Math.min(this.player.inventory.length - 1, this.selectedInventoryIndex + 1); break;
      case 'use': {
        const item = this.player.inventory[this.selectedInventoryIndex];
        if (!item) break;
        if (item.type === 'weapon' || item.type === 'armor') {
          const old = this.player.equip(item); this.player.removeItem(this.selectedInventoryIndex);
          if (old) this.player.addItem(old); this.log.add(`Equipped ${item.name}.`, '#88ff88');
        } else if (item.type === 'potion') {
          const r = this.player.useItem(item); this.player.removeItem(this.selectedInventoryIndex);
          this.log.add(r.effect === 'heal' ? `Healed ${r.value} HP!` : `Restored ${r.value} MP!`, '#88ff88');
        } else if (item.type === 'scroll') {
          const r = this.player.useItem(item); this.player.removeItem(this.selectedInventoryIndex);
          if (r.effect === 'reveal') { this.floor.revealAll(); this.log.add('Map revealed!', '#ffcc00'); }
          else if (r.effect === 'teleport') {
            const room = this.floor.rooms[Math.floor(Math.random() * this.floor.rooms.length)];
            this.player.x = room.cx; this.player.y = room.cy; this._computeFov();
            this.log.add('Teleported!', '#cc44ff');
          }
        }
        if (this.selectedInventoryIndex >= this.player.inventory.length)
          this.selectedInventoryIndex = Math.max(0, this.player.inventory.length - 1);
        break;
      }
      case 'drop': {
        const item = this.player.removeItem(this.selectedInventoryIndex);
        if (item) { item.x = this.player.x; item.y = this.player.y; this.floor.items.push(item); this.log.add(`Dropped ${item.name}.`, '#888'); }
        if (this.selectedInventoryIndex >= this.player.inventory.length)
          this.selectedInventoryIndex = Math.max(0, this.player.inventory.length - 1);
        break;
      }
    }
  }
  _processMonsterTurns() {
    for (const monster of this.floor.monsters) {
      if (!monster.isAlive) continue;
      if (Math.abs(monster.x - this.player.x) + Math.abs(monster.y - this.player.y) > MONSTER_ACTIVATION_RADIUS) continue;
      const action = monster.getAction(this.player.x, this.player.y, this.floor);
      if (action.type === 'move') {
        monster.x += action.dx; monster.y += action.dy;
        if (monster.x === this.player.x && monster.y === this.player.y) {
          monster.x -= action.dx; monster.y -= action.dy;
          this.combat = new Combat(this.player, monster); this.state = 'combat';
          this.log.add(`A ${monster.name} attacks you!`, '#ff8844'); return;
        }
      } else if (action.type === 'attack') {
        this.combat = new Combat(this.player, monster); this.state = 'combat';
        this.log.add(`A ${monster.name} attacks you!`, '#ff8844'); return;
      }
    }
  }
  _checkItemsOnGround() {
    const items = this.floor.getItemsAt(this.player.x, this.player.y);
    if (items.length > 0) this.log.add(`You see: ${items.map(i => i.name).join(', ')} [G to pickup]`, '#aaa');
  }
  getState() {
    return { state: this.state, player: this.player, floor: this.floor, floorLevel: this.floorLevel,
      combat: this.combat, log: this.log.getRecent(6), selectedInventoryIndex: this.selectedInventoryIndex };
  }
}

// === RENDERER ===
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');

const game = new Game();
let cellW = 12, cellH = 18;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  const mrect = minimapCanvas.getBoundingClientRect();
  minimapCanvas.width = mrect.width;
  minimapCanvas.height = mrect.height;
}

function tileColor(tile, visible) {
  if (!visible) {
    if (tile === TILE.WALL) return COLORS.EXPLORED_WALL;
    return COLORS.EXPLORED_FLOOR;
  }
  switch (tile) {
    case TILE.WALL: return COLORS.WALL;
    case TILE.FLOOR: return COLORS.FLOOR;
    case TILE.DOOR: return COLORS.DOOR;
    case TILE.STAIRS_DOWN: case TILE.STAIRS_UP: return COLORS.STAIRS;
    default: return COLORS.FLOOR;
  }
}

function renderMap(gs) {
  const { floor, player } = gs;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${cellH - 2}px Courier New, monospace`;
  ctx.textBaseline = 'top';

  const viewCols = Math.floor(canvas.width / cellW);
  const viewRows = Math.floor(canvas.height / cellH);
  const offsetX = Math.max(0, Math.min(floor.width - viewCols, player.x - Math.floor(viewCols / 2)));
  const offsetY = Math.max(0, Math.min(floor.height - viewRows, player.y - Math.floor(viewRows / 2)));

  for (let vy = 0; vy < viewRows; vy++) {
    for (let vx = 0; vx < viewCols; vx++) {
      const x = offsetX + vx, y = offsetY + vy;
      if (x >= floor.width || y >= floor.height) continue;

      const px = vx * cellW, py = vy * cellH;

      if (x === player.x && y === player.y) {
        ctx.fillStyle = '#ffffff';
        ctx.fillText('@', px + 1, py + 1);
        continue;
      }

      if (floor.visible[y][x]) {
        const monster = floor.getMonsterAt(x, y);
        if (monster) { ctx.fillStyle = monster.color; ctx.fillText(monster.char, px + 1, py + 1); continue; }
        const items = floor.getItemsAt(x, y);
        if (items.length) { ctx.fillStyle = items[0].color; ctx.fillText(items[0].char, px + 1, py + 1); continue; }
        ctx.fillStyle = tileColor(floor.getTile(x, y), true);
        ctx.fillText(floor.getTile(x, y), px + 1, py + 1);
      } else if (floor.explored[y][x]) {
        ctx.fillStyle = tileColor(floor.getTile(x, y), false);
        ctx.fillText(floor.getTile(x, y), px + 1, py + 1);
      }
    }
  }
}

function renderMinimap(gs) {
  const { floor, player } = gs;
  minimapCtx.fillStyle = '#000';
  minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  const scale = Math.min(minimapCanvas.width / floor.width, minimapCanvas.height / floor.height);
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (!floor.explored[y][x]) continue;
      const tile = floor.getTile(x, y);
      if (tile === TILE.WALL) minimapCtx.fillStyle = '#333';
      else if (tile === TILE.STAIRS_DOWN) minimapCtx.fillStyle = '#0cc';
      else minimapCtx.fillStyle = '#1a1a1a';
      minimapCtx.fillRect(x * scale, y * scale, Math.max(1, scale), Math.max(1, scale));
    }
  }
  // Player dot
  minimapCtx.fillStyle = '#fff';
  minimapCtx.fillRect(player.x * scale - 1, player.y * scale - 1, Math.max(3, scale + 2), Math.max(3, scale + 2));
}

function renderStats(gs) {
  const p = gs.player;
  const panel = document.getElementById('stats-content');
  panel.innerHTML = `
    <div class="stat-value">${p.name} &mdash; Lv.${p.level}</div>
    <div class="stat-label">HP ${p.hp}/${p.maxHp}</div>
    <div class="stat-bar"><div class="stat-bar-fill hp-fill" style="width:${(p.hp/p.maxHp)*100}%"></div></div>
    <div class="stat-label">MP ${p.mp}/${p.maxMp}</div>
    <div class="stat-bar"><div class="stat-bar-fill mp-fill" style="width:${(p.mp/p.maxMp)*100}%"></div></div>
    <div class="stat-label">XP ${p.xp}/${p.xpToNext}</div>
    <div class="stat-bar"><div class="stat-bar-fill xp-fill" style="width:${(p.xp/p.xpToNext)*100}%"></div></div>
    <div class="stat-value" style="margin-top:8px">ATK: <span style="color:#cc8800">${p.attack}</span> &nbsp; DEF: <span style="color:#44aacc">${p.defense}</span></div>
    <div class="stat-value">Floor: ${gs.floorLevel} &nbsp; Turns: ${p.turnsPlayed}</div>
    <div class="stat-value">Kills: ${p.monstersKilled}</div>
    <div class="equip-info">Wpn: ${p.weapon ? p.weapon.name : 'Fists'}<br>Arm: ${p.armor ? p.armor.name : 'None'}</div>
  `;
}

function renderLogPanel(gs) {
  const el = document.getElementById('log-content');
  el.innerHTML = gs.log.map(m => `<div class="log-msg" style="color:${m.color}">&gt; ${m.text}</div>`).join('');
}

function renderCombat(gs) {
  const el = document.getElementById('combat-overlay');
  const m = gs.combat.monster;
  el.style.display = 'block';
  document.getElementById('combat-content').innerHTML = `
    <div class="combat-monster" style="color:${m.color}">${m.char} ${m.name}</div>
    <div class="stat-label">HP ${m.hp}/${m.maxHp}</div>
    <div class="stat-bar"><div class="stat-bar-fill hp-fill" style="width:${(m.hp/m.maxHp)*100}%"></div></div>
    <div style="margin-top:8px">ATK: ${m.attack} &nbsp; DEF: ${m.defense}</div>
    <div class="combat-actions">
      <div class="combat-key"><span style="color:#cc8800">[A]</span> Attack</div>
      <div class="combat-key"><span style="color:#4488ff">[D]</span> Defend</div>
      <div class="combat-key"><span style="color:#44cc44">[F]</span> Flee</div>
      <div class="combat-key"><span style="color:#cc44ff">[P]</span> Potion</div>
    </div>
  `;
}

function renderInventory(gs) {
  const el = document.getElementById('inventory-overlay');
  const p = gs.player;
  el.style.display = 'block';
  let html = '<h3 style="color:#44aacc;margin-bottom:10px">Inventory</h3>';
  if (!p.inventory.length) html += '<div style="color:#666">(empty)</div>';
  else {
    for (let i = 0; i < p.inventory.length; i++) {
      const item = p.inventory[i];
      const sel = i === gs.selectedInventoryIndex;
      let stats = '';
      if (item.type === 'weapon') stats = ` (ATK +${item.attack})`;
      if (item.type === 'armor') stats = ` (DEF +${item.defense})`;
      if (item.effect === 'heal') stats = ` (+${item.value} HP)`;
      if (item.effect === 'mana') stats = ` (+${item.value} MP)`;
      html += `<div class="inv-item${sel ? ' selected' : ''}" style="color:${sel ? '#ffcc00' : '#aaa'}">
        ${sel ? '> ' : '  '}<span style="color:${item.color}">${item.char}</span> ${item.name}${stats}</div>`;
    }
  }
  html += '<div class="inv-controls">[E] Use/Equip &nbsp; [X] Drop &nbsp; [I/ESC] Close &nbsp; ↑↓ Select</div>';
  document.getElementById('inventory-content').innerHTML = html;
}

function renderGameOver(gs) {
  const el = document.getElementById('gameover-overlay');
  const p = gs.player;
  const win = gs.state === 'victory';
  el.style.display = 'block';
  el.style.borderColor = win ? '#cc8800' : '#cc2222';
  document.getElementById('gameover-content').innerHTML = `
    <h2 style="color:${win ? '#ffcc00' : '#ff4444'};margin-bottom:15px">${win ? 'VICTORY!' : 'GAME OVER'}</h2>
    <p>${win ? 'You escaped the dungeon!' : 'You have been slain...'}</p>
    <div style="margin:15px 0;line-height:1.8">
      Level: ${p.level}<br>Floor reached: ${gs.floorLevel}<br>
      Monsters slain: ${p.monstersKilled}<br>Turns survived: ${p.turnsPlayed}
    </div>
    <p style="color:#4c4">[ENTER] New Game</p>
  `;
}

function render() {
  const gs = game.getState();
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('combat-overlay').style.display = 'none';
  document.getElementById('inventory-overlay').style.display = 'none';
  document.getElementById('gameover-overlay').style.display = 'none';

  if (gs.state === 'title') {
    document.getElementById('title-screen').style.display = 'block';
    return;
  }

  renderMap(gs);
  renderStats(gs);
  renderMinimap(gs);
  renderLogPanel(gs);

  if (gs.state === 'combat') renderCombat(gs);
  else if (gs.state === 'inventory') renderInventory(gs);
  else if (gs.state === 'gameover' || gs.state === 'victory') renderGameOver(gs);
}

// === INPUT ===
document.addEventListener('keydown', (e) => {
  const gs = game.getState();
  const key = e.key.toLowerCase();

  // Prevent scrolling
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase()) || e.key === ' ') {
    e.preventDefault();
  }

  if (gs.state === 'title' || gs.state === 'gameover' || gs.state === 'victory') {
    if (e.key === 'Enter') game.handleCommand({ type: 'newgame' });
    render(); return;
  }

  if (gs.state === 'combat') {
    if (key === 'a') game.handleCommand({ type: 'attack' });
    else if (key === 'd') game.handleCommand({ type: 'defend' });
    else if (key === 'f') game.handleCommand({ type: 'flee' });
    else if (key === 'p') {
      const idx = gs.player.inventory.findIndex(i => i.type === 'potion');
      if (idx >= 0) game.handleCommand({ type: 'useItem', index: idx });
    }
    render(); return;
  }

  if (gs.state === 'inventory') {
    if (key === 'i' || key === 'escape') game.handleCommand({ type: 'close' });
    else if (key === 'arrowup' || key === 'w') game.handleCommand({ type: 'select_up' });
    else if (key === 'arrowdown' || key === 's') game.handleCommand({ type: 'select_down' });
    else if (key === 'e' || key === 'enter') game.handleCommand({ type: 'use' });
    else if (key === 'x') game.handleCommand({ type: 'drop' });
    render(); return;
  }

  // Playing
  if (key === 'arrowup' || key === 'w') game.handleCommand({ type: 'move', dx: 0, dy: -1 });
  else if (key === 'arrowdown' || key === 's') game.handleCommand({ type: 'move', dx: 0, dy: 1 });
  else if (key === 'arrowleft' || key === 'a') game.handleCommand({ type: 'move', dx: -1, dy: 0 });
  else if (key === 'arrowright' || key === 'd') game.handleCommand({ type: 'move', dx: 1, dy: 0 });
  else if (key === 'g') game.handleCommand({ type: 'pickup' });
  else if (key === '>' || key === '.') game.handleCommand({ type: 'descend' });
  else if (key === ' ') game.handleCommand({ type: 'wait' });
  else if (key === 'i') game.handleCommand({ type: 'inventory' });

  render();
});

// Init
window.addEventListener('resize', () => { resizeCanvas(); render(); });
resizeCanvas();
render();
canvas.focus();
