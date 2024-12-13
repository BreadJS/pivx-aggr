class Sfx {
  constructor(context) {
    this.timestamp = +new Date();
    this.context = context;  // Use the passed-in context
    window.play = this.tradeToSong.bind(this);
    this.connect();  // Initialize connection once
  }

  connect() {
    const tuna = new Tuna(this.context);

    // Create audio effects
    this.output = new tuna.PingPongDelay({
      wetLevel: 0.5,
      feedback: 0.01,
      delayTimeLeft: 175,
      delayTimeRight: 100,
    });

    const filter = new tuna.Filter({
      frequency: 700,
      Q: 10,
      gain: -10,
      filterType: 'highpass',
      bypass: 0,
    });

    // Connect the effects
    this.output.connect(filter);
    filter.connect(this.context.destination);
  }

  tradeToSong(factor, side) {
    const now = +new Date();
    this.queued++;

    setTimeout(() => {
      this.queued--;

      // Sound logic based on the `factor` and `side`
      if (side) {
        if (factor >= 10) {
          [659.26, 830.6, 987.76, 1318.52].forEach((f, i) =>
            setTimeout(() => this.play(f, 0.05 + Math.sqrt(factor) / 15, 0.1 + factor * 0.1), i * 80)
          );
        } else if (factor >= 1) {
          [659.26, 830.6].forEach((f, i) =>
            setTimeout(() => this.play(f, 0.05 + Math.sqrt(factor) / 10, 0.1 + factor * 0.1), i * 80)
          );
        } else {
          this.play(659.26, Math.sqrt(factor) / 10, 0.1 + Math.sqrt(factor) / 10);
        }
      } else {
        // Sell sound logic
        if (factor >= 10) {
          [493.88, 369.99, 293.66, 246.94].forEach((f, i) =>
            setTimeout(() => this.play(f, 0.05 + Math.sqrt(factor) / 10, i > 2 ? 0.1 + factor * 0.1 : 0.2), i * 80)
          );
        } else if (factor >= 1) {
          [493.88, 392].forEach((f, i) =>
            setTimeout(() => this.play(f, 0.05 + Math.sqrt(factor) / 10, 0.1 + factor * 0.1), i * 80)
          );
        } else {
          this.play(493.88, Math.sqrt(factor) / 10, 0.1 + Math.sqrt(factor) / 10);
        }
      }
    }, this.timestamp - now);

    this.timestamp = Math.max(this.timestamp, now) + (this.queued > 20 ? 40 : 80);
  }

  play(frequency, value = 0.5, length = 0.1, type = 'triangle', volume = 0.2) {
    if (this.context.state !== 'running') {
      return;
    }

    const time = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    oscillator.onended = () => {
      oscillator.disconnect();
    };

    gain.connect(this.output);
    oscillator.connect(gain);
    length *= 1.1;

    gain.gain.value = volume;

    gain.gain.setValueAtTime(gain.gain.value, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + length);

    oscillator.start(time);
    oscillator.stop(time + length);
  }

  disconnect() {
    this.context && this.context.state === 'running' && this.context.close();
  }
}
