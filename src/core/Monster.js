export class Monster {
  constructor(type, x, y, floorLevel = 1) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.type = type.name.toLowerCase();
    this.name = type.name;
    this.char = type.char;
    this.color = type.color;
    this.x = x;
    this.y = y;

    // Scale stats with floor level
    const scale = 1 + (floorLevel - type.minFloor) * 0.15;
    this.maxHp = Math.floor(type.hp * scale);
    this.hp = this.maxHp;
    this.attack = Math.floor(type.attack * scale);
    this.defense = Math.floor(type.defense * scale);
    this.xp = Math.floor(type.xp * scale);
    this.speed = type.speed;

    this.state = 'idle'; // idle, alert, fleeing
    this.alertTurns = 0;
  }

  get isAlive() {
    return this.hp > 0;
  }

  takeDamage(amount) {
    const actual = Math.max(1, amount - this.defense);
    this.hp = Math.max(0, this.hp - actual);
    return actual;
  }

  getAction(playerX, playerY, floor) {
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.abs(dx) + Math.abs(dy);

    // Flee if low HP
    if (this.hp < this.maxHp * 0.2) {
      this.state = 'fleeing';
      return this._flee(dx, dy, floor);
    }

    // Chase if alert or player is close
    if (dist <= 6 || this.state === 'alert') {
      this.state = 'alert';
      this.alertTurns = 8;

      if (dist === 1) {
        return { type: 'attack' };
      }
      return this._chase(dx, dy, floor);
    }

    // Idle: wander randomly
    if (this.alertTurns > 0) {
      this.alertTurns--;
      if (this.alertTurns === 0) this.state = 'idle';
    }

    return this._wander(floor);
  }

  _chase(dx, dy, floor) {
    // Simple pathfinding: move toward player
    const moves = [];
    if (dx > 0) moves.push({ mx: 1, my: 0, priority: Math.abs(dx) });
    if (dx < 0) moves.push({ mx: -1, my: 0, priority: Math.abs(dx) });
    if (dy > 0) moves.push({ mx: 0, my: 1, priority: Math.abs(dy) });
    if (dy < 0) moves.push({ mx: 0, my: -1, priority: Math.abs(dy) });

    // Sort by priority (move along the axis with greater distance)
    moves.sort((a, b) => b.priority - a.priority);

    for (const move of moves) {
      const nx = this.x + move.mx;
      const ny = this.y + move.my;
      if (floor.isPassable(nx, ny) && !floor.getMonsterAt(nx, ny)) {
        return { type: 'move', dx: move.mx, dy: move.my };
      }
    }
    return { type: 'wait' };
  }

  _flee(dx, dy, floor) {
    // Move away from player
    const moves = [];
    if (dx > 0) moves.push({ mx: -1, my: 0 });
    if (dx < 0) moves.push({ mx: 1, my: 0 });
    if (dy > 0) moves.push({ mx: 0, my: -1 });
    if (dy < 0) moves.push({ mx: 0, my: 1 });

    for (const move of moves) {
      const nx = this.x + move.mx;
      const ny = this.y + move.my;
      if (floor.isPassable(nx, ny) && !floor.getMonsterAt(nx, ny)) {
        return { type: 'move', dx: move.mx, dy: move.my };
      }
    }
    return { type: 'wait' };
  }

  _wander(floor) {
    if (Math.random() < 0.6) return { type: 'wait' }; // Often just stand still

    const dirs = [
      { mx: 0, my: -1 }, { mx: 0, my: 1 },
      { mx: -1, my: 0 }, { mx: 1, my: 0 },
    ];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const nx = this.x + dir.mx;
    const ny = this.y + dir.my;

    if (floor.isPassable(nx, ny) && !floor.getMonsterAt(nx, ny)) {
      return { type: 'move', dx: dir.mx, dy: dir.my };
    }
    return { type: 'wait' };
  }
}
