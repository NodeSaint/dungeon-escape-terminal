import { XP_PER_LEVEL, MAX_INVENTORY } from './Constants.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.char = '@';
    this.color = '#ffffff';
    this.name = 'Hero';

    this.level = 1;
    this.xp = 0;
    this.xpToNext = XP_PER_LEVEL(1);

    this.maxHp = 50;
    this.hp = 50;
    this.maxMp = 20;
    this.mp = 20;

    this.baseAttack = 5;
    this.baseDefense = 2;

    this.weapon = null;
    this.armor = null;
    this.inventory = [];

    this.defending = false;
    this.turnsPlayed = 0;
    this.monstersKilled = 0;
    this.gold = 0;
  }

  get attack() {
    return this.baseAttack + (this.weapon ? this.weapon.attack : 0);
  }

  get defense() {
    return this.baseDefense + (this.armor ? this.armor.defense : 0);
  }

  addXp(amount) {
    this.xp += amount;
    const leveledUp = [];
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = XP_PER_LEVEL(this.level);
      this.maxHp += 10;
      this.hp = this.maxHp;
      this.maxMp += 5;
      this.mp = this.maxMp;
      this.baseAttack += 2;
      this.baseDefense += 1;
      leveledUp.push(this.level);
    }
    return leveledUp;
  }

  canPickup() {
    return this.inventory.length < MAX_INVENTORY;
  }

  addItem(item) {
    if (this.canPickup()) {
      this.inventory.push(item);
      return true;
    }
    return false;
  }

  removeItem(index) {
    if (index >= 0 && index < this.inventory.length) {
      return this.inventory.splice(index, 1)[0];
    }
    return null;
  }

  equip(item) {
    if (item.type === 'weapon') {
      const old = this.weapon;
      this.weapon = item;
      return old;
    } else if (item.type === 'armor') {
      const old = this.armor;
      this.armor = item;
      return old;
    }
    return null;
  }

  useItem(item) {
    if (item.type !== 'potion' && item.type !== 'scroll') return null;

    if (item.effect === 'heal') {
      const healed = Math.min(item.value, this.maxHp - this.hp);
      this.hp += healed;
      return { effect: 'heal', value: healed };
    } else if (item.effect === 'mana') {
      const restored = Math.min(item.value, this.maxMp - this.mp);
      this.mp += restored;
      return { effect: 'mana', value: restored };
    }
    return { effect: item.effect, value: item.value };
  }

  get isAlive() {
    return this.hp > 0;
  }

  takeDamage(amount) {
    const actual = this.defending ? Math.floor(amount / 2) : amount;
    this.hp = Math.max(0, this.hp - actual);
    return actual;
  }
}
