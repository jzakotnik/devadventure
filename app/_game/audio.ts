/** Tiny WebAudio chiptune: sound effects and a looping melody. All optional. */

type Wave = OscillatorType

export class Sound {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private step = 0
  muted = false

  /** Must be called from a user gesture. */
  unlock() {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    try {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 1
      this.master.connect(this.ctx.destination)
    } catch {
      this.ctx = null
    }
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.master) this.master.gain.value = m ? 0 : 1
  }

  private tone(
    freq: number,
    dur: number,
    type: Wave = "square",
    vol = 0.05,
    when = 0,
    slideTo?: number
  ) {
    if (!this.ctx || !this.master) return
    const t0 = this.ctx.currentTime + when
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
    g.gain.setValueAtTime(vol, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  stepSfx() {
    this.tone(90 + Math.random() * 30, 0.05, "triangle", 0.04)
  }
  door() {
    this.tone(520, 0.08, "square", 0.04)
    this.tone(780, 0.12, "square", 0.04, 0.08)
  }
  blip(i: number) {
    this.tone(300 + (i % 4) * 40, 0.025, "square", 0.025)
  }
  select() {
    this.tone(660, 0.06, "square", 0.05)
  }
  talk() {
    this.tone(440, 0.05, "square", 0.05)
    this.tone(660, 0.07, "square", 0.05, 0.05)
  }
  good() {
    ;[523, 659, 784].forEach((f, i) =>
      this.tone(f, 0.12, "square", 0.05, i * 0.08)
    )
  }
  bad() {
    this.tone(220, 0.25, "sawtooth", 0.05, 0, 110)
  }
  alert() {
    ;[880, 660, 880].forEach((f, i) =>
      this.tone(f, 0.09, "square", 0.05, i * 0.1)
    )
  }
  achievement() {
    ;[784, 988, 1175, 1568].forEach((f, i) =>
      this.tone(f, 0.14, "square", 0.05, i * 0.07)
    )
  }
  fanfare() {
    ;[523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) =>
      this.tone(f, 0.18, "square", 0.06, i * 0.12)
    )
  }
  fail() {
    ;[392, 330, 262, 196].forEach((f, i) =>
      this.tone(f, 0.25, "triangle", 0.07, i * 0.2)
    )
  }

  startMusic() {
    if (this.timer || !this.ctx) return
    const lead = [0, 3, 7, 10, 7, 3, 5, 8, 12, 8, 5, 3, 2, 5, 7, 5]
    const bass = [0, 0, 5, 5, -2, -2, 3, 3]
    const base = 220
    this.timer = setInterval(() => {
      const i = this.step++
      const n = lead[i % lead.length]
      if (i % 2 === 0) this.tone(base * 2 ** (n / 12), 0.2, "square", 0.012)
      if (i % 4 === 0)
        this.tone(
          (base / 2) * 2 ** (bass[(i / 4) % bass.length] / 12),
          0.45,
          "triangle",
          0.03
        )
    }, 230)
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }
}
