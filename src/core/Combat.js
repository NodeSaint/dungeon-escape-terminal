export class Combat {
  constructor(player, monster) {
    this.player = player;
    this.monster = monster;
    this.active = true;
    this.messages = [];
    this.turnCount = 0;
  }

  playerAttack() {
    if (!this.active) return [];
    this.messages = [];
    this.turnCount++;

    this.player.defending = false;

    // Player attacks
    const rawDmg = this.player.attack + Math.floor(Math.random() * 4) - 1;
    const dmg = this.monster.takeDamage(rawDmg);
    this.messages.push({
      text: `You hit the ${this.monster.name} for ${dmg} damage!`,
      color: '#ffcc00',
    });

    if (!this.monster.isAlive) {
      this._monsterDied();
      return this.messages;
    }

    this._monsterTurn();
    return this.messages;
  }

  playerDefend() {
    if (!this.active) return [];
    this.messages = [];
    this.turnCount++;

    this.player.defending = true;
    this.messages.push({
      text: 'You brace yourself for the attack!',
      color: '#4488ff',
    });

    this._monsterTurn();
    return this.messages;
  }

  playerFlee() {
    if (!this.active) return [];
    this.messages = [];

    const chance = 0.5 + (this.player.level - 1) * 0.05;
    if (Math.random() < chance) {
      this.messages.push({
        text: 'You flee from combat!',
        color: '#88ff88',
      });
      this.active = false;
      return this.messages;
    }

    this.messages.push({
      text: 'You failed to escape!',
      color: '#ff8888',
    });

    this._monsterTurn();
    return this.messages;
  }

  _monsterTurn() {
    if (!this.monster.isAlive || !this.active) return;

    const rawDmg = this.monster.attack + Math.floor(Math.random() * 3) - 1;
    const dmg = this.player.takeDamage(rawDmg);
    this.messages.push({
      text: `The ${this.monster.name} strikes you for ${dmg} damage!`,
      color: '#ff4444',
    });

    if (!this.player.isAlive) {
      this.messages.push({
        text: 'You have been slain!',
        color: '#ff0000',
      });
      this.active = false;
    }
  }

  _monsterDied() {
    const levels = this.player.addXp(this.monster.xp);
    this.messages.push({
      text: `The ${this.monster.name} is defeated! (+${this.monster.xp} XP)`,
      color: '#00ff00',
    });
    for (const lvl of levels) {
      this.messages.push({
        text: `*** LEVEL UP! You are now level ${lvl}! ***`,
        color: '#ffff00',
      });
    }
    this.player.monstersKilled++;
    this.active = false;
  }
}
