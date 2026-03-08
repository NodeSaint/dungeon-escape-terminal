// Game balance and display constants

export const MAP_WIDTH = 80;
export const MAP_HEIGHT = 40;

export const TILE = {
  WALL: '#',
  FLOOR: '.',
  DOOR: '+',
  STAIRS_DOWN: '>',
  STAIRS_UP: '<',
  VOID: ' ',
};

export const COLORS = {
  WALL: '#888888',
  FLOOR: '#444444',
  DOOR: '#cc8800',
  STAIRS: '#00cccc',
  PLAYER: '#ffffff',
  EXPLORED: '#222222',
  FOG: '#000000',
  HP_BAR: '#cc0000',
  MP_BAR: '#0044cc',
  XP_BAR: '#00cc00',
  GOLD: '#ffcc00',
};

export const MONSTER_TYPES = {
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

export const ITEM_TYPES = {
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

export const FOV_RADIUS = 8;
export const MONSTER_ACTIVATION_RADIUS = 12;
export const MAX_INVENTORY = 15;
export const XP_PER_LEVEL = (level) => Math.floor(100 * Math.pow(level, 1.4));
export const MAX_FLOOR = 10;
