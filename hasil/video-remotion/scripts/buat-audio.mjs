// Membuat backsound hangat + efek suara Cakrawala sepenuhnya dengan kode.
// Waktu tiap efek diambil dari src/timeline.json, file yang sama yang dipakai
// animasi Remotion, jadi suara jatuh tepat di frame saat teks mendarat.
// Hasil: public/audio.wav (44.1 kHz, stereo, 16-bit).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const T = JSON.parse(readFileSync(join(root, "src/timeline.json"), "utf8"));

const SR = 44100;
const FPS = T.fps;
const DUR = T.durasi / FPS;
const N = Math.ceil(DUR * SR);
const f2s = (f) => f / FPS; // frame -> detik
const E = T.event;

// Bus: musik kering, efek kering, dan kiriman ke reverb.
const music = [new Float32Array(N), new Float32Array(N)];
const sfx = [new Float32Array(N), new Float32Array(N)];
const send = [new Float32Array(N), new Float32Array(N)];

// RNG berbenih supaya hasil render selalu sama.
let seed = 20261124;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const noise = () => rnd() * 2 - 1;

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

function put(bus, i, v, pan = 0, sendAmt = 0) {
  if (i < 0 || i >= N) return;
  const l = Math.cos((pan + 1) * Math.PI / 4);
  const r = Math.sin((pan + 1) * Math.PI / 4);
  bus[0][i] += v * l;
  bus[1][i] += v * r;
  if (sendAmt) {
    send[0][i] += v * l * sendAmt;
    send[1][i] += v * r * sendAmt;
  }
}

// Biquad RBJ sederhana.
class Biquad {
  constructor() { this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set("lp", 1000, 0.7); }
  set(type, f, q) {
    const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR;
    const a = Math.sin(w) / (2 * q), c = Math.cos(w);
    let b0, b1, b2;
    if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = a; b1 = 0; b2 = -a; } // band-pass
    const a0 = 1 + a;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = -2 * c / a0; this.a2 = (1 - a) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

// ---------------------------------------------------------------- MUSIK
// Progresi hangat di D mayor, satu akor tiap 3 detik.
const CHORDS = [
  { bass: 38, notes: [62, 66, 69, 74] }, // D
  { bass: 45, notes: [61, 64, 69, 73] }, // A
  { bass: 47, notes: [62, 66, 71, 74] }, // Bm
  { bass: 43, notes: [62, 67, 71, 74] }, // G
  { bass: 38, notes: [62, 66, 69, 74] }, // D
  { bass: 45, notes: [61, 64, 69, 76] }, // A
  { bass: 43, notes: [62, 67, 71, 74] }, // G
  { bass: 38, notes: [62, 66, 69, 74] }, // D (akhir)
];
const CH = 3; // detik per akor
const chordAt = (t) => CHORDS[Math.min(CHORDS.length - 1, Math.floor(t / CH))];

// Intensitas musik naik pelan: gelap -> terang.
const energy = (t) => {
  const p = t / DUR;
  return 0.55 + 0.45 * Math.min(1, p * 1.25);
};
const masterFade = (t) => Math.min(1, t / 1.2) * Math.min(1, (DUR - t) / 1.4);

// Pad: aditif (harmonik 1..6 lembut) + detune kecil, attack pelan.
function pad() {
  CHORDS.forEach((ch, ci) => {
    const t0 = ci * CH;
    const last = ci === CHORDS.length - 1;
    const len = last ? DUR - t0 : CH + 1.4;
    const voices = ch.notes.map((m) => ({ f: midi(m), a: 0.05 })).concat([{ f: midi(ch.bass), a: 0.085, bass: true }]);
    voices.forEach((v, vi) => {
      const pan = v.bass ? 0 : (vi - 1.5) * 0.35;
      const ph = [rnd(), rnd(), rnd()].map((x) => x * 6.28);
      const s0 = Math.floor(t0 * SR), s1 = Math.min(N, Math.floor((t0 + len) * SR));
      for (let i = s0; i < s1; i++) {
        const lt = (i - s0) / SR;
        const t = i / SR;
        const att = Math.min(1, lt / 0.9);
        const rel = last ? 1 : Math.min(1, Math.max(0, (CH + 1.4 - lt) / 1.4));
        const env = att * att * (3 - 2 * att) * rel;
        let s = 0;
        const H = v.bass ? 3 : 6;
        for (let d = 0; d < 3; d++) {
          const det = 1 + (d - 1) * 0.0025;
          for (let h = 1; h <= H; h++) {
            s += Math.sin(2 * Math.PI * v.f * det * h * lt + ph[d] * h) / (h * h * 0.8 + 0.2);
          }
        }
        // getar pelan (tremolo) supaya terasa hidup
        const trem = 1 + 0.08 * Math.sin(2 * Math.PI * 0.25 * t + vi);
        put(music, i, s * v.a * env * trem * energy(t) * masterFade(t) / 3, pan, 0.55);
      }
    });
  });
}

// Kotak musik / kalimba: muncul mulai adegan program, ketika "cahaya" mulai naik.
function bell(t0, f, amp, pan, decay = 0.9, bus = music, sendAmt = 0.6) {
  const s0 = Math.floor(t0 * SR), len = Math.floor((decay * 4) * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const a = Math.min(1, t / 0.004);
    const v =
      Math.sin(2 * Math.PI * f * t) * Math.exp(-t / decay) +
      0.25 * Math.sin(2 * Math.PI * f * 3.01 * t) * Math.exp(-t / (decay * 0.35)) +
      0.12 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t / (decay * 0.15));
    put(bus, s0 + i, v * a * amp * masterFade((s0 + i) / SR), pan, sendAmt);
  }
}

function arpeggio() {
  const start = f2s(T.adegan.program.mulai);
  const step = CH / 8;
  const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
  for (let t = Math.ceil(start / step) * step; t < DUR - 1.6; t += step) {
    const ch = chordAt(t);
    const k = Math.round(t / step) % 8;
    const m = ch.notes[pattern[k]] + 12;
    const ramp = Math.min(1, (t - start) / 2.5);
    bell(t, midi(m), 0.035 * ramp, k % 2 ? 0.3 : -0.3, 0.5);
  }
}

// ---------------------------------------------------------------- EFEK
// Langkah kaki di jalan setapak tanah/rumput.
function footstep(t0, k, gain = 1) {
  const s0 = Math.floor(t0 * SR);
  const pan = k % 2 ? 0.18 : -0.18;
  const amp = (0.9 + rnd() * 0.25) * gain;
  const lp = new Biquad(); lp.set("lp", 1400 + rnd() * 600, 0.8);
  const bp = new Biquad(); bp.set("bp", 3200 + rnd() * 1200, 1.2);
  const len = Math.floor(0.18 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    // hentakan tumit
    const f = 55 + 45 * Math.exp(-t / 0.02);
    const thump = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.045) * Math.min(1, t / 0.002);
    // gemeresik tanah / rumput (tumit lalu ujung kaki)
    const n = noise();
    const crunch = lp.run(n) * (Math.exp(-t / 0.035) + 0.6 * Math.exp(-Math.max(0, t - 0.05) / 0.03) * (t > 0.05));
    const grass = bp.run(n) * Math.exp(-t / 0.05) * 0.5;
    put(sfx, s0 + i, (thump * 0.42 + crunch * 0.32 + grass * 0.22) * amp, pan, 0.12);
  }
}

// Gemeresik kertas dengan pita frekuensi yang menyapu.
function rustle(t0, dur, fA, fB, amp, pan = 0, bursts = 6) {
  const s0 = Math.floor(t0 * SR), len = Math.floor(dur * SR);
  const bp = new Biquad(), hp = new Biquad();
  hp.set("hp", 900, 0.7);
  const marks = Array.from({ length: bursts }, () => rnd() * dur * 0.85);
  for (let i = 0; i < len; i++) {
    const t = i / SR, p = t / dur;
    if (i % 32 === 0) bp.set("bp", fA + (fB - fA) * p, 0.9);
    let env = Math.sin(Math.PI * Math.min(1, p)) ** 1.5;
    for (const m of marks) if (t >= m) env += 0.9 * Math.exp(-(t - m) / 0.012);
    const v = bp.run(hp.run(noise())) * env;
    put(sfx, s0 + i, v * amp, pan + (p - 0.5) * 0.4, 0.25);
  }
}

function thud(t0, fHi, fLo, decay, amp) {
  const s0 = Math.floor(t0 * SR), len = Math.floor(decay * 6 * SR);
  const lp = new Biquad(); lp.set("lp", 500, 0.7);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = fLo + (fHi - fLo) * Math.exp(-t / 0.03);
    const v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / decay) * Math.min(1, t / 0.002)
      + lp.run(noise()) * 0.4 * Math.exp(-t / 0.02);
    put(sfx, s0 + i, v * amp, 0, 0.2);
  }
}

// Buku terbuka: sampul jatuh pelan + halaman tersibak.
function bookOpen(tLand) {
  rustle(tLand - 0.32, 0.36, 2200, 5200, 0.55, -0.15, 5); // halaman terangkat
  thud(tLand, 150, 70, 0.08, 0.5);                        // sampul menyentuh
  rustle(tLand + 0.02, 0.45, 5000, 2600, 0.38, 0.15, 7);  // halaman jatuh terbuka
}
// Satu halaman dibalik.
function pageFlip(tLand) {
  rustle(tLand - 0.2, 0.3, 2800, 6000, 0.42, -0.2, 3);
  thud(tLand, 120, 80, 0.04, 0.18);
}

// Nada palu lembut saat teks mendarat, mengikuti akor yang sedang berbunyi.
function land(tLand, idx, amp = 0.13) {
  amp *= 1.5;
  const ch = chordAt(tLand);
  const m = ch.notes[idx % ch.notes.length] + 12;
  bell(tLand, midi(m), amp, (idx % 3 - 1) * 0.25, 0.7, sfx, 0.5);
  thud(tLand, 110, 60, 0.05, 0.16);
}

function shimmer(t0, amp = 0.07) {
  const ch = chordAt(t0);
  [0, 1, 2, 3, 0].forEach((n, k) => {
    const m = ch.notes[n] + (k === 4 ? 36 : 24);
    bell(t0 + k * 0.055, midi(m), amp, -0.4 + k * 0.2, 1.1, sfx, 0.8);
  });
}

function whoosh(tPeak, dur, amp) {
  const s0 = Math.floor((tPeak - dur * 0.7) * SR), len = Math.floor(dur * SR);
  const bp = new Biquad();
  for (let i = 0; i < len; i++) {
    const p = i / len;
    if (i % 32 === 0) bp.set("bp", 400 + 2600 * Math.sin(Math.PI * p * 0.7), 0.7);
    const env = p < 0.7 ? (p / 0.7) ** 2 : Math.exp(-(p - 0.7) / 0.08);
    put(sfx, s0 + i, bp.run(noise()) * env * amp, (p - 0.5) * 0.8, 0.4);
  }
}

// Riser "matahari terbit" sebelum logo.
function riser(tEnd, dur, amp) {
  const s0 = Math.floor((tEnd - dur) * SR), len = Math.floor(dur * SR);
  const bp = new Biquad();
  for (let i = 0; i < len; i++) {
    const p = i / len;
    if (i % 32 === 0) bp.set("bp", 300 + 4000 * p * p, 1.2);
    put(sfx, s0 + i, bp.run(noise()) * p * p * amp, 0, 0.6);
  }
}

function pop(t0, amp) {
  const s0 = Math.floor(t0 * SR), len = Math.floor(0.2 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 380 + 520 * (1 - Math.exp(-t / 0.025));
    put(sfx, s0 + i, Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.05) * Math.min(1, t / 0.002) * amp, 0, 0.3);
  }
}

// ---------------------------------------------------------------- SUSUN
pad();
arpeggio();

// Adegan 1: langkah kaki anak berjalan ke sekolah, makin pelan di akhir.
const LK = T.langkahKaki;
for (let f = LK.mulai, k = 0; f <= LK.selesai; f += LK.jarak, k++) {
  const t = f2s(f);
  const fade = 1 - Math.max(0, (f - (LK.selesai - 40)) / 60);
  footstep(t, k, fade * 0.7);
}
land(f2s(E.hook1), 0, 0.09);
land(f2s(E.hook2), 1, 0.09);
shimmer(f2s(E.hook3), 0.05);

// Adegan 2: kebutuhan.
whoosh(f2s(T.adegan.kebutuhan.mulai), 0.6, 0.12);
land(f2s(E.butuh1), 0, 0.12);
land(f2s(E.butuh2), 1, 0.12);
land(f2s(E.butuh3), 2, 0.12);
shimmer(f2s(E.butuhAksen), 0.07);

// Adegan 3: program, buku terbuka + halaman dibalik tiap kartu.
whoosh(f2s(T.adegan.program.mulai), 0.6, 0.12);
land(f2s(E.programJudul), 3, 0.1);
bookOpen(f2s(E.program1));
pageFlip(f2s(E.program2));
pageFlip(f2s(E.program3));

// Adegan 4: cara donasi, nada naik tiap langkah.
whoosh(f2s(T.adegan.donasi.mulai), 0.6, 0.12);
land(f2s(E.donasiJudul), 0, 0.1);
land(f2s(E.donasi1), 1, 0.13);
land(f2s(E.donasi2), 2, 0.13);
land(f2s(E.donasi3), 3, 0.13);

// Adegan 5: logo terbit dari buku, judul, tombol.
riser(f2s(E.logo), 1.0, 0.09);
bookOpen(f2s(E.logo));
shimmer(f2s(E.logo) + 0.05, 0.08);
land(f2s(E.ajakanJudul), 0, 0.12);
shimmer(f2s(E.ajakanAksen), 0.06);
pop(f2s(E.tombol), 0.28);
land(f2s(E.tombol), 3, 0.08);

// ---------------------------------------------------------------- REVERB
function reverb(inp) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => ({ d, buf: new Float32Array(d), i: 0, lp: 0 }));
  const aps = [556, 441, 225].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
  const out = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.7 + c.lp * 0.3;
      c.buf[c.i] = inp[n] + c.lp * 0.82;
      c.i = (c.i + 1) % c.d;
      s += y;
    }
    s /= combs.length;
    for (const a of aps) {
      const b = a.buf[a.i];
      const y = -s * 0.5 + b;
      a.buf[a.i] = s + b * 0.5;
      a.i = (a.i + 1) % a.d;
      s = y;
    }
    out[n] = s;
  }
  return out;
}
// Geser sedikit untuk kanan supaya stereo lebar.
const revL = reverb(send[0]);
const revR = reverb(new Float32Array(N).map((_, i) => send[1][Math.max(0, i - 23)]));

// ---------------------------------------------------------------- MIX
const out = [new Float32Array(N), new Float32Array(N)];
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  for (let c = 0; c < 2; c++) {
    const v = music[c][i] * 0.9 + sfx[c][i] + (c ? revR[i] : revL[i]) * 0.45;
    // saturasi lembut
    out[c][i] = Math.tanh(v * 1.1) * Math.min(1, (DUR - t) / 0.05);
    peak = Math.max(peak, Math.abs(out[c][i]));
  }
}
const gain = 0.89 / peak; // ~ -1 dBFS

const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8);
buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[0][i] * gain)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[1][i] * gain)) * 32767), 46 + i * 4);
}
mkdirSync(join(root, "public"), { recursive: true });
writeFileSync(join(root, "public/audio.wav"), buf);
console.log(`audio.wav: ${DUR}s, puncak dinormalisasi (gain ${gain.toFixed(2)})`);
