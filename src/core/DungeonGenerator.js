import * as ROT from 'rot-js';
import { MAP_WIDTH, MAP_HEIGHT, TILE, MONSTER_TYPES, ITEM_TYPES } from './Constants.js';
import { Floor } from './Floor.js';
import { Monster } from './Monster.js';

export class DungeonGenerator {
  static generate(floorLevel, seed) {
    const tiles = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      tiles[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        tiles[y][x] = TILE.WALL;
      }
    }

    // Use rot-js Digger to carve out rooms and corridors
    const digger = new ROT.Map.Digger(MAP_WIDTH, MAP_HEIGHT, {
      roomWidth: [4, 9],
      roomHeight: [3, 6],
      corridorLength: [2, 8],
      dugPercentage: 0.35 + floorLevel * 0.02,
    });

    const rooms = [];
    digger.create((x, y, wall) => {
      if (!wall) {
        tiles[y][x] = TILE.FLOOR;
      }
    });

    // Get rooms from digger
    for (const room of digger.getRooms()) {
      rooms.push({
        x1: room.getLeft(),
        y1: room.getTop(),
        x2: room.getRight(),
        y2: room.getBottom(),
        cx: Math.floor((room.getLeft() + room.getRight()) / 2),
        cy: Math.floor((room.getTop() + room.getBottom()) / 2),
      });

      // Add doors
      room.getDoors((x, y) => {
        if (x > 0 && x < MAP_WIDTH - 1 && y > 0 && y < MAP_HEIGHT - 1) {
          tiles[y][x] = TILE.DOOR;
        }
      });
    }

    // Place stairs
    const startRoom = rooms[0];
    const endRoom = rooms[rooms.length - 1];

    tiles[startRoom.cy][startRoom.cx] = TILE.STAIRS_UP;
    tiles[endRoom.cy][endRoom.cx] = TILE.STAIRS_DOWN;

    const floor = new Floor(tiles, floorLevel, rooms);
    floor.playerStartX = startRoom.cx;
    floor.playerStartY = startRoom.cy;
    floor.stairsDownX = endRoom.cx;
    floor.stairsDownY = endRoom.cy;

    // Place monsters (skip starting room)
    DungeonGenerator._placeMonsters(floor, rooms.slice(1), floorLevel);

    // Place items (skip starting room)
    DungeonGenerator._placeItems(floor, rooms.slice(1), floorLevel);

    return floor;
  }

  static _placeMonsters(floor, rooms, floorLevel) {
    const monsterCount = Math.floor(3 + floorLevel * 2 + Math.random() * 3);
    const eligible = Object.values(MONSTER_TYPES).filter(m => m.minFloor <= floorLevel);

    for (let i = 0; i < monsterCount && rooms.length > 0; i++) {
      const room = rooms[Math.floor(Math.random() * rooms.length)];
      const x = room.x1 + Math.floor(Math.random() * (room.x2 - room.x1 + 1));
      const y = room.y1 + Math.floor(Math.random() * (room.y2 - room.y1 + 1));

      if (floor.isPassable(x, y) && !floor.getMonsterAt(x, y)) {
        // Prefer harder monsters on deeper floors
        const weights = eligible.map(m => Math.max(1, floorLevel - m.minFloor + 2));
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let roll = Math.random() * totalWeight;
        let type = eligible[0];
        for (let j = 0; j < eligible.length; j++) {
          roll -= weights[j];
          if (roll <= 0) {
            type = eligible[j];
            break;
          }
        }

        floor.monsters.push(new Monster(type, x, y, floorLevel));
      }
    }
  }

  static _placeItems(floor, rooms, floorLevel) {
    const itemCount = Math.floor(2 + floorLevel * 0.8 + Math.random() * 3);
    const eligible = Object.entries(ITEM_TYPES).filter(([, v]) => v.rarity <= floorLevel + 2);

    for (let i = 0; i < itemCount && rooms.length > 0; i++) {
      const room = rooms[Math.floor(Math.random() * rooms.length)];
      const x = room.x1 + Math.floor(Math.random() * (room.x2 - room.x1 + 1));
      const y = room.y1 + Math.floor(Math.random() * (room.y2 - room.y1 + 1));

      if (floor.isPassable(x, y)) {
        // Prefer common items, weighted by inverse rarity
        const weights = eligible.map(([, v]) => Math.max(1, floorLevel + 3 - v.rarity));
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let roll = Math.random() * totalWeight;
        let chosen = eligible[0];
        for (let j = 0; j < eligible.length; j++) {
          roll -= weights[j];
          if (roll <= 0) {
            chosen = eligible[j];
            break;
          }
        }

        const [key, template] = chosen;
        floor.items.push({
          id: Math.random().toString(36).substr(2, 9),
          key,
          ...template,
          x,
          y,
        });
      }
    }
  }
}
