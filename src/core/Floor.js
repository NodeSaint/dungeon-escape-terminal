import { MAP_WIDTH, MAP_HEIGHT, TILE } from './Constants.js';

export class Floor {
  constructor(tiles, level, rooms) {
    this.tiles = tiles;
    this.level = level;
    this.rooms = rooms;
    this.monsters = [];
    this.items = [];
    this.playerStartX = 0;
    this.playerStartY = 0;
    this.stairsDownX = 0;
    this.stairsDownY = 0;
    this.width = MAP_WIDTH;
    this.height = MAP_HEIGHT;

    // FOV tracking
    this.visible = [];
    this.explored = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.visible[y] = new Array(MAP_WIDTH).fill(false);
      this.explored[y] = new Array(MAP_WIDTH).fill(false);
    }
  }

  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return TILE.WALL;
    return this.tiles[y][x];
  }

  isPassable(x, y) {
    const tile = this.getTile(x, y);
    return tile !== TILE.WALL && tile !== TILE.VOID;
  }

  isTransparent(x, y) {
    const tile = this.getTile(x, y);
    return tile !== TILE.WALL && tile !== TILE.VOID;
  }

  getMonsterAt(x, y) {
    return this.monsters.find(m => m.x === x && m.y === y && m.isAlive);
  }

  getItemsAt(x, y) {
    return this.items.filter(item => item.x === x && item.y === y);
  }

  removeItem(itemId) {
    this.items = this.items.filter(item => item.id !== itemId);
  }

  removeMonster(monsterId) {
    this.monsters = this.monsters.filter(m => m.id !== monsterId);
  }

  clearVisibility() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.visible[y][x] = false;
      }
    }
  }

  setVisible(x, y) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.visible[y][x] = true;
      this.explored[y][x] = true;
    }
  }

  revealAll() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.explored[y][x] = true;
      }
    }
  }
}
