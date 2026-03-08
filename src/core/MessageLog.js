export class MessageLog {
  constructor(maxMessages = 100) {
    this.messages = [];
    this.maxMessages = maxMessages;
  }

  add(text, color = '#cccccc') {
    this.messages.push({ text, color, turn: Date.now() });
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }
  }

  getRecent(count = 5) {
    return this.messages.slice(-count);
  }

  clear() {
    this.messages = [];
  }
}
