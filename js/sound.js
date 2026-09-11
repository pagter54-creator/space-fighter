const Sound = {
  ctx: null,
  muted: false,
  noiseBuffer: null,
  initialized: false,

  bgmVolume: 0.2,
  sfxVolume: 0.25,

  bgmTracks: {
    normal: new Audio('audio/bgm_normal.mp3'),
    miniboss: new Audio('audio/bgm_miniboss.mp3'),
    laserboss: new Audio('audio/bgm_miniboss2.mp3'), // 프리즘 코어 전용 BGM 등록
    elitegroup: new Audio('audio/bgm_miniboss3.mp3'),
    finalboss: new Audio('audio/bgm_middleboss.mp3'),
    // 팬텀 전용 트랙. 오디오 에셋은 별도로 제공될 때 이 경로로 재생된다.
    phantom: new Audio('audio/bgm_middleboss2.mp3'),
    warshipboss: new Audio('audio/bgm_finalboss2.mp3'),
    // CHRONOS는 최종보스 테마를 사용한다.
    chronos: new Audio('audio/bgm_finalboss.mp3'),
    // 차후 추가될 ARSENAL FRAME 중간보스 전용 트랙을 미리 연결한다.
    arsenal: new Audio('audio/bgm_middleboss3.mp3')
  },
  currentBgm: null,

  init() {
    if (this.initialized && this.ctx && this.ctx.state === 'running') return;

    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.generateNoiseBuffer();

      for (let key in this.bgmTracks) {
        this.bgmTracks[key].loop = true;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!this.initialized) {
      this.initialized = true;
      for (let key in this.bgmTracks) {
        const track = this.bgmTracks[key];
        track.play().then(() => {
          if (this.currentBgm !== track) {
            track.pause();
            track.currentTime = 0;
          }
        }).catch(() => {});
      }
    }
  },

  generateNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 1.5;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  },

  playBGM(type) {
    const targetTrack = this.bgmTracks[type];
    if (!targetTrack) return;

    if (this.currentBgm === targetTrack && !targetTrack.paused) {
      return;
    }

    this.stopBGM();

    this.currentBgm = targetTrack;
    this.currentBgm.volume = this.muted ? 0 : this.bgmVolume;
    this.currentBgm.currentTime = 0;
    this.currentBgm.play().catch(() => {});
  },

  stopBGM() {
    if (this.currentBgm) {
      this.currentBgm.pause();
      this.currentBgm.currentTime = 0;
      this.currentBgm = null;
    }
  },

  setBGMVolume(val) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    if (this.currentBgm && !this.muted) {
      this.currentBgm.volume = this.bgmVolume;
    }
  },

  setSFXVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
  },

  playShoot(type) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'omni') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gain.gain.setValueAtTime(0.22 * this.sfxVolume, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'drone') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.11);
      gain.gain.setValueAtTime(0.32 * this.sfxVolume, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.11);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (type === 'laser') {
      this.playLaserBeam();
    } else if (type === 'lightning') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
      gain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'blackhole') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.24);
      gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
      gain.gain.setValueAtTime(0.12 * this.sfxVolume, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  },

  playLaserBeam() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.exponentialRampToValueAtTime(95, now + 0.45);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1100, now);
    osc2.frequency.linearRampToValueAtTime(540, now + 0.45);

    gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  },

  playEyeFlash() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.22);
    gain.gain.setValueAtTime(0.4 * this.sfxVolume, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  },

  playEnemyShoot() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);
    gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.14);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  },

  playExplosion(isBig = false) {
    if (this.muted || !this.ctx || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBig ? 550 : 800, now);
    filter.frequency.linearRampToValueAtTime(isBig ? 50 : 100, now + (isBig ? 0.5 : 0.22));

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime((isBig ? 0.6 : 0.35) * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (isBig ? 0.5 : 0.22));

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(now);
    source.stop(now + (isBig ? 0.5 : 0.22));
  },

  playHit() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
    gain.gain.setValueAtTime(0.4 * this.sfxVolume, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  },

  playShield() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.16);
    gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  },

  playItem() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 783.99];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.05);
      gain.gain.setValueAtTime(0.2 * this.sfxVolume, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.05 + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.1);
    });
  },

  playUpgrade() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.25 * this.sfxVolume, now + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.01, now + i * 0.07 + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.18);
    });
  },

  playBomb() {
    if (this.muted || !this.ctx || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.8);
    oscGain.gain.setValueAtTime(0.5 * this.sfxVolume, now);
    oscGain.gain.linearRampToValueAtTime(0.01, now + 0.8);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.8);

    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(60, now + 0.9);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(now);
    source.stop(now + 0.9);
  },

  playPhaseAlert() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now + i * 0.14);
      gain.gain.setValueAtTime(0.2 * this.sfxVolume, now + i * 0.14);
      gain.gain.linearRampToValueAtTime(0.01, now + i * 0.14 + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.08);
    }
  },

  playGundamBeam() {
    if (this.muted || !this.ctx || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const chargeOsc = this.ctx.createOscillator();
    const chargeGain = this.ctx.createGain();
    chargeOsc.type = 'sine';
    chargeOsc.frequency.setValueAtTime(220, now);
    chargeOsc.frequency.exponentialRampToValueAtTime(1400, now + 0.6);
    chargeGain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
    chargeGain.gain.linearRampToValueAtTime(0.01, now + 0.6);
    chargeOsc.connect(chargeGain);
    chargeGain.connect(this.ctx.destination);
    chargeOsc.start(now);
    chargeOsc.stop(now + 0.6);

    setTimeout(() => {
      if (!this.ctx) return;
      const beamNow = this.ctx.currentTime;
      const beamOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      beamOsc.type = 'sawtooth';
      beamOsc.frequency.setValueAtTime(110, beamNow);
      beamOsc.frequency.linearRampToValueAtTime(55, beamNow + 1.8);
      bGain.gain.setValueAtTime(0.7 * this.sfxVolume, beamNow);
      bGain.gain.exponentialRampToValueAtTime(0.01, beamNow + 1.8);
      beamOsc.connect(bGain);
      bGain.connect(this.ctx.destination);
      beamOsc.start(beamNow);
      beamOsc.stop(beamNow + 1.8);
    }, 500);
  }
};
