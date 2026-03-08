import * as ROT from 'rot-js';
import { DungeonGenerator } from './DungeonGenerator.js';
import { Player } from './Player.js';
import { Combat } from './Combat.js';
import { MessageLog } from './MessageLog.js';
import { FOV_RADIUS, MONSTER_ACTIVATION_RADIUS, MAX_FLOOR } from './Constants.js';

export class Game {
  constructor() {
    this.state = 'title'; // title, playing, combat, inventory, gameover, victory
    this.player = null;
    this.floor = null;
    this.floorLevel = 0;
    this.combat = null;
    this.log = new MessageLog();
    this.selectedInventoryIndex = 0;
  }

  newGame() {
    this.player = new Player(0, 0);
    this.floorLevel = 1;
    this.log.clear();
    this.log.add('You descend into the dungeon...', '#aaaaff');
    this.log.add('Find the stairs (>) to go deeper. Reach floor 10 to escape!', '#aaaaff');
    this._generateFloor();
    this.state = 'playing';
  }

  _generateFloor() {
    this.floor = DungeonGenerator.generate(this.floorLevel);
    this.player.x = this.floor.playerStartX;
    this.player.y = this.floor.playerStartY;
    this._computeFov();
  }

  _computeFov() {
    this.floor.clearVisibility();
    const fov = new ROT.FOV.RecursiveShadowcasting((x, y) => {
      return this.floor.isTransparent(x, y);
    });
    fov.compute(this.player.x, this.player.y, FOV_RADIUS, (x, y) => {
      this.floor.setVisible(x, y);
    });
  }

  handleCommand(cmd) {
    if (this.state === 'title') {
      if (cmd.type === 'newgame') {
        this.newGame();
      }
      return;
    }

    if (this.state === 'gameover' || this.state === 'victory') {
      if (cmd.type === 'newgame') {
        this.newGame();
      }
      return;
    }

    if (this.state === 'inventory') {
      this._handleInventory(cmd);
      return;
    }

    if (this.state === 'combat') {
      this._handleCombat(cmd);
      return;
    }

    if (this.state === 'playing') {
      this._handlePlaying(cmd);
    }
  }

  _handlePlaying(cmd) {
    switch (cmd.type) {
      case 'move': {
        const nx = this.player.x + cmd.dx;
        const ny = this.player.y + cmd.dy;

        // Check for monster
        const monster = this.floor.getMonsterAt(nx, ny);
        if (monster) {
          this.combat = new Combat(this.player, monster);
          this.state = 'combat';
          this.log.add(`A ${monster.name} blocks your path!`, '#ff8844');
          return;
        }

        if (this.floor.isPassable(nx, ny)) {
          this.player.x = nx;
          this.player.y = ny;
          this.player.turnsPlayed++;
          this._processMonsterTurns();
          this._computeFov();
          this._checkItemsOnGround();
        }
        break;
      }
      case 'pickup': {
        const items = this.floor.getItemsAt(this.player.x, this.player.y);
        if (items.length === 0) {
          this.log.add('Nothing to pick up here.', '#888888');
        } else {
          for (const item of items) {
            if (this.player.addItem(item)) {
              this.floor.removeItem(item.id);
              this.log.add(`Picked up ${item.name}.`, '#88ff88');
            } else {
              this.log.add('Inventory is full!', '#ff8888');
              break;
            }
          }
        }
        break;
      }
      case 'descend': {
        if (this.player.x === this.floor.stairsDownX && this.player.y === this.floor.stairsDownY) {
          this.floorLevel++;
          if (this.floorLevel > MAX_FLOOR) {
            this.state = 'victory';
            this.log.add('You escaped the dungeon! VICTORY!', '#ffff00');
          } else {
            this.log.add(`Descending to floor ${this.floorLevel}...`, '#aaaaff');
            this._generateFloor();
          }
        } else {
          this.log.add('There are no stairs here.', '#888888');
        }
        break;
      }
      case 'inventory': {
        this.state = 'inventory';
        this.selectedInventoryIndex = 0;
        break;
      }
      case 'wait': {
        this.player.turnsPlayed++;
        this._processMonsterTurns();
        this._computeFov();
        break;
      }
    }
  }

  _handleCombat(cmd) {
    let messages = [];
    switch (cmd.type) {
      case 'attack':
        messages = this.combat.playerAttack();
        break;
      case 'defend':
        messages = this.combat.playerDefend();
        break;
      case 'flee':
        messages = this.combat.playerFlee();
        break;
      case 'useItem': {
        if (cmd.index !== undefined && cmd.index < this.player.inventory.length) {
          const item = this.player.inventory[cmd.index];
          if (item.type === 'potion') {
            const result = this.player.useItem(item);
            this.player.removeItem(cmd.index);
            if (result.effect === 'heal') {
              messages = [{ text: `You drink the ${item.name}. Healed ${result.value} HP!`, color: '#88ff88' }];
            } else if (result.effect === 'mana') {
              messages = [{ text: `You drink the ${item.name}. Restored ${result.value} MP!`, color: '#8888ff' }];
            }
            // Monster still attacks
            if (this.combat.active) {
              this.combat._monsterTurn();
              messages = messages.concat(this.combat.messages);
            }
          } else {
            messages = [{ text: "Can't use that in combat!", color: '#ff8888' }];
          }
        }
        break;
      }
    }

    for (const msg of messages) {
      this.log.add(msg.text, msg.color);
    }

    if (!this.combat.active) {
      if (!this.player.isAlive) {
        this.state = 'gameover';
      } else {
        // Remove dead monster from floor
        if (!this.combat.monster.isAlive) {
          this.floor.removeMonster(this.combat.monster.id);
        }
        this.combat = null;
        this.state = 'playing';
      }
    }
  }

  _handleInventory(cmd) {
    switch (cmd.type) {
      case 'close':
      case 'inventory':
        this.state = 'playing';
        break;
      case 'select_up':
        this.selectedInventoryIndex = Math.max(0, this.selectedInventoryIndex - 1);
        break;
      case 'select_down':
        this.selectedInventoryIndex = Math.min(
          this.player.inventory.length - 1,
          this.selectedInventoryIndex + 1
        );
        break;
      case 'use': {
        const item = this.player.inventory[this.selectedInventoryIndex];
        if (!item) break;
        if (item.type === 'weapon' || item.type === 'armor') {
          const old = this.player.equip(item);
          this.player.removeItem(this.selectedInventoryIndex);
          if (old) this.player.addItem(old);
          this.log.add(`Equipped ${item.name}.`, '#88ff88');
        } else if (item.type === 'potion') {
          const result = this.player.useItem(item);
          this.player.removeItem(this.selectedInventoryIndex);
          if (result.effect === 'heal') {
            this.log.add(`Healed ${result.value} HP!`, '#88ff88');
          } else if (result.effect === 'mana') {
            this.log.add(`Restored ${result.value} MP!`, '#8888ff');
          }
        } else if (item.type === 'scroll') {
          const result = this.player.useItem(item);
          this.player.removeItem(this.selectedInventoryIndex);
          if (result.effect === 'reveal') {
            this.floor.revealAll();
            this.log.add('The scroll reveals the entire floor!', '#ffcc00');
          } else if (result.effect === 'teleport') {
            const rooms = this.floor.rooms;
            const room = rooms[Math.floor(Math.random() * rooms.length)];
            this.player.x = room.cx;
            this.player.y = room.cy;
            this._computeFov();
            this.log.add('You are teleported to a random room!', '#cc44ff');
          }
        }
        if (this.selectedInventoryIndex >= this.player.inventory.length) {
          this.selectedInventoryIndex = Math.max(0, this.player.inventory.length - 1);
        }
        break;
      }
      case 'drop': {
        const item = this.player.removeItem(this.selectedInventoryIndex);
        if (item) {
          item.x = this.player.x;
          item.y = this.player.y;
          this.floor.items.push(item);
          this.log.add(`Dropped ${item.name}.`, '#888888');
        }
        if (this.selectedInventoryIndex >= this.player.inventory.length) {
          this.selectedInventoryIndex = Math.max(0, this.player.inventory.length - 1);
        }
        break;
      }
    }
  }

  _processMonsterTurns() {
    for (const monster of this.floor.monsters) {
      if (!monster.isAlive) continue;
      const dist = Math.abs(monster.x - this.player.x) + Math.abs(monster.y - this.player.y);
      if (dist > MONSTER_ACTIVATION_RADIUS) continue;

      const action = monster.getAction(this.player.x, this.player.y, this.floor);
      if (action.type === 'move') {
        monster.x += action.dx;
        monster.y += action.dy;

        // Check if monster moved into player
        if (monster.x === this.player.x && monster.y === this.player.y) {
          monster.x -= action.dx;
          monster.y -= action.dy;
          this.combat = new Combat(this.player, monster);
          this.state = 'combat';
          this.log.add(`A ${monster.name} attacks you!`, '#ff8844');
          return;
        }
      } else if (action.type === 'attack') {
        // Adjacent monster attacks = start combat
        this.combat = new Combat(this.player, monster);
        this.state = 'combat';
        this.log.add(`A ${monster.name} attacks you!`, '#ff8844');
        return;
      }
    }
  }

  _checkItemsOnGround() {
    const items = this.floor.getItemsAt(this.player.x, this.player.y);
    if (items.length > 0) {
      const names = items.map(i => i.name).join(', ');
      this.log.add(`You see: ${names} (g to pick up)`, '#aaaaaa');
    }
  }

  getState() {
    return {
      state: this.state,
      player: this.player,
      floor: this.floor,
      floorLevel: this.floorLevel,
      combat: this.combat,
      log: this.log.getRecent(6),
      selectedInventoryIndex: this.selectedInventoryIndex,
    };
  }
}
