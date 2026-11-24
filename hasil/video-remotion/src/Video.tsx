import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import T from "./timeline.json";
import { ARCHIVO, INTER, SERIF } from "./fonts";

const C = {
  krem: "#F6F4DD",
  malam: "#2C3459",
  senja: "#445574",
  oranye: "#E75E19",
  emas: "#ECA912",
  peach: "#EE9958",
  mentega: "#EED680",
  kabut: "#AAB8C9",
};

const E = T.event;
const A = T.adegan;
const X = 96; // margin samping
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ------------------------------------------------------------------ gerak
// Teks "mendarat": jatuh dengan percepatan dan menyentuh posisinya TEPAT di
// frame `at` (frame yang sama dengan efek suara), lalu memantul kecil.
const useLand = (at: number, from: [number, number] = [-34, 46]) => {
  const f = useCurrentFrame();
  const D = 9;
  const p = interpolate(f, [at - D, at], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const squash = interpolate(f, [at, at + 3, at + 9], [1, 0.965, 1], clamp);
  return {
    opacity: interpolate(f, [at - D, at - D + 4], [0, 1], clamp),
    transform: `translate(${from[0] * (1 - p)}px, ${from[1] * (1 - p)}px) scale(${2 - squash}, ${squash})`,
    transformOrigin: "50% 100%",
  } as React.CSSProperties;
};

const Land: React.FC<{ at: number; from?: [number, number]; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at, from, style, children,
}) => <div style={{ ...useLand(at, from), ...style }}>{children}</div>;

// Fade masuk/keluar per adegan (frame lokal Sequence).
const SceneFade: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, len - 10, len], [0, 1, 1, 0], clamp);
  const y = interpolate(f, [len - 10, len], [0, -30], clamp);
  return <AbsoluteFill style={{ opacity: o, transform: `translateY(${y}px)` }}>{children}</AbsoluteFill>;
};

// ------------------------------------------------------------------ teks
const Label: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = C.mentega, style }) => (
  <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 26, letterSpacing: "0.32em", textTransform: "uppercase", color, ...style }}>
    {children}
  </div>
);

const Judul: React.FC<{ size?: number; color?: string; weight?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  size = 96, color = C.krem, weight = 900, children, style,
}) => (
  <div style={{ fontFamily: ARCHIVO, fontWeight: weight, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.025em", color, ...style }}>
    {children}
  </div>
);

const Aksen: React.FC<{ size?: number; color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  size = 128, color = C.emas, children, style,
}) => (
  <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: size, lineHeight: 1, color, ...style }}>{children}</div>
);

// Label kecil di tepi atas (gaya editorial), di dalam zona aman.
const Bingkai: React.FC<{ no: number }> = ({ no }) => (
  <>
    <Label color={C.kabut} style={{ position: "absolute", left: X, top: 262, fontSize: 22 }}>Cakrawala</Label>
    <Label color={C.kabut} style={{ position: "absolute", right: X, top: 262, fontSize: 22, letterSpacing: "0.2em" }}>
      0{no} / 05
    </Label>
  </>
);

// ------------------------------------------------------------------ latar
// Langit yang perlahan terang: gelap -> terang, cahaya dari kanan bawah
// naik ke arah diagonal kanan atas.
const Langit: React.FC = () => {
  const f = useCurrentFrame();
  const p = f / T.durasi;
  const glow = interpolate(p, [0, 0.55, 1], [0.12, 0.45, 1], clamp);
  const cy = interpolate(p, [0, 1], [1950, 1520], clamp);
  const r = interpolate(p, [0, 1], [700, 1250], clamp);
  return (
    <AbsoluteFill style={{ background: C.malam }}>
      {/* lapisan Biru Senja di bawah (pendukung 30%) */}
      <AbsoluteFill
        style={{ background: `linear-gradient(180deg, ${C.malam} 0%, ${C.malam} 38%, ${C.senja} 100%)`, opacity: 0.9 }}
      />
      {/* cahaya fajar */}
      <AbsoluteFill
        style={{
          opacity: glow,
          background: `radial-gradient(${r}px ${r * 0.8}px at 78% ${cy}px, ${C.emas} 0%, ${C.peach} 22%, rgba(238,153,88,0.35) 45%, rgba(44,52,89,0) 72%)`,
        }}
      />
      {/* sapuan diagonal naik ke kanan atas */}
      <AbsoluteFill
        style={{
          opacity: 0.18 + glow * 0.25,
          background: `linear-gradient(35deg, rgba(44,52,89,0) 40%, rgba(238,153,88,0.35) 62%, rgba(44,52,89,0) 64%, rgba(44,52,89,0) 70%, rgba(236,169,18,0.25) 74%, rgba(44,52,89,0) 76%)`,
          transform: `translateY(${interpolate(f, [0, T.durasi], [140, -140])}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// Grain film halus yang berganti tiap 2 frame.
const Grain: React.FC = () => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2) % 12;
  return (
    <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.2, pointerEvents: "none" }}>
      <svg width="1080" height="1920">
        <filter id={`g${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ ikon
const IkonBuku: React.FC<{ open: number }> = ({ open }) => (
  // Halaman kiri dan kanan membuka dari tengah (sinkron dengan suara buku terbuka).
  <svg width="92" height="92" viewBox="0 0 92 92" fill="none" stroke={C.emas} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
    <g style={{ transform: `scaleX(${open})`, transformOrigin: "46px 50px" }}>
      <path d="M46 26 C36 19 22 18 10 21 V70 C22 67 36 68 46 75 Z" />
      <path d="M46 26 C56 19 70 18 82 21 V70 C70 67 56 68 46 75 Z" />
    </g>
    <path d="M46 26 V75" />
  </svg>
);
const IkonGuru = () => (
  <svg width="92" height="92" viewBox="0 0 92 92" fill="none" stroke={C.emas} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
    <rect x="34" y="14" width="48" height="34" rx="4" />
    <path d="M44 28 L58 28 M44 36 L70 36" />
    <circle cx="22" cy="34" r="9" />
    <path d="M8 78 C8 60 14 52 22 52 C28 52 32 56 36 60 L46 50" />
  </svg>
);
const IkonRak = () => (
  <svg width="92" height="92" viewBox="0 0 92 92" fill="none" stroke={C.emas} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
    <path d="M10 78 H82 M10 46 H82" />
    <path d="M16 46 V20 M27 46 V24 M38 46 V18 M52 46 L62 22" />
    <path d="M16 78 V54 M28 78 V58 M40 78 V52 M54 78 V56 M66 78 V54" />
  </svg>
);

// ------------------------------------------------------------------ adegan
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const len = A.hook.selesai - A.hook.mulai;
  const zoom = interpolate(f, [0, len], [1.06, 1.2]);
  const fotoO = interpolate(f, [len - 16, len], [1, 0], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: fotoO }}>
        <Img
          src={staticFile("foto-anak-membaca-hutan.jpg")}
          style={{
            width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 70%",
            transform: `scale(${zoom}) translateY(${interpolate(f, [0, len], [0, -24])}px)`,
            filter: "saturate(0.9) contrast(1.05)",
          }}
        />
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(44,52,89,.92) 0%, rgba(44,52,89,.78) 30%, rgba(44,52,89,.12) 52%, rgba(44,52,89,0) 70%, rgba(44,52,89,.75) 100%)",
          }}
        />
        <AbsoluteFill style={{ background: "linear-gradient(35deg, rgba(44,52,89,.25), rgba(236,169,18,.12))" }} />
      </AbsoluteFill>
      <SceneFade len={len}>
        <Bingkai no={1} />
        <div style={{ position: "absolute", left: X, right: X, top: 360 }}>
          <Land at={E.hook1 - 8} from={[0, 20]}><Label>Di pedalaman negeri</Label></Land>
          <Land at={E.hook1} style={{ marginTop: 28 }}><Judul size={118}>Setiap pagi,</Judul></Land>
          <Land at={E.hook2} style={{ marginTop: 6 }}><Judul size={84} weight={800}>mereka berjalan jauh</Judul></Land>
          <Land at={E.hook3} style={{ marginTop: 4 }}><Aksen size={136}>untuk belajar.</Aksen></Land>
        </div>
      </SceneFade>
    </AbsoluteFill>
  );
};

const Kebutuhan: React.FC = () => {
  const len = A.kebutuhan.selesai - A.kebutuhan.mulai;
  const o = A.kebutuhan.mulai;
  const items: [number, string][] = [
    [E.butuh1 - o, "Buku bacaan sulit didapat."],
    [E.butuh2 - o, "Guru jarang mendapat pelatihan."],
    [E.butuh3 - o, "Banyak anak belum lancar membaca."],
  ];
  return (
    <SceneFade len={len}>
      <Bingkai no={2} />
      <div style={{ position: "absolute", left: X, right: X, top: 470 }}>
        <Land at={E.butuhLabel - o} from={[0, 20]}><Label>Tapi di sana,</Label></Land>
        <div style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 40 }}>
          {items.map(([at, t]) => (
            <Land key={t} at={at} from={[-40, 40]} style={{ display: "flex", gap: 30, alignItems: "flex-start" }}>
              <div style={{ width: 22, height: 22, marginTop: 24, borderRadius: 11, background: C.emas, flex: "none" }} />
              <Judul size={70} weight={800} style={{ lineHeight: 1.08 }}>{t}</Judul>
            </Land>
          ))}
        </div>
        <div style={{ marginTop: 96 }}>
          <Land at={E.butuhAksen - o - 6}><Judul size={78} weight={800} color={C.kabut}>Mereka butuh</Judul></Land>
          <Land at={E.butuhAksen - o}><Aksen size={150}>perhatian kita.</Aksen></Land>
        </div>
      </div>
    </SceneFade>
  );
};

const Program: React.FC = () => {
  const f = useCurrentFrame();
  const len = A.program.selesai - A.program.mulai;
  const o = A.program.mulai;
  const open = interpolate(f, [E.program1 - o - 9, E.program1 - o, E.program1 - o + 6], [0.05, 0.85, 1], clamp);
  const cards: [number, React.ReactNode, string, string][] = [
    [E.program1 - o, <IkonBuku open={open} />, "Kelas Literasi & Numerasi", "Pendampingan membaca, menulis, dan berhitung untuk siswa SD."],
    [E.program2 - o, <IkonGuru />, "Pelatihan Guru", "Lokakarya metode mengajar aktif bagi guru."],
    [E.program3 - o, <IkonRak />, "Pojok Baca Komunitas", "Perpustakaan kecil yang dikelola relawan setempat."],
  ];
  return (
    <SceneFade len={len}>
      <Bingkai no={3} />
      <div style={{ position: "absolute", left: X, right: X, top: 430 }}>
        <Land at={E.programJudul - o - 6} from={[0, 20]}><Label>Bersama Cakrawala</Label></Land>
        <Land at={E.programJudul - o} style={{ marginTop: 24 }}><Judul size={96}>Tiga cara kami mendampingi</Judul></Land>
        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 28 }}>
          {cards.map(([at, icon, title, desc], i) => (
            <Land key={title} at={at} from={[-70, 60]}>
              <div
                style={{
                  display: "flex", gap: 32, alignItems: "center", padding: "34px 40px",
                  background: C.senja, borderRadius: 28, marginLeft: i * 28,
                  boxShadow: "0 18px 40px rgba(20,24,45,.35)", borderLeft: `6px solid ${C.emas}`,
                }}
              >
                <div style={{ flex: "none" }}>{icon}</div>
                <div>
                  <Judul size={48} weight={800}>{title}</Judul>
                  <div style={{ fontFamily: INTER, fontSize: 29, lineHeight: 1.35, color: C.krem, opacity: 0.85, marginTop: 10 }}>{desc}</div>
                </div>
              </div>
            </Land>
          ))}
        </div>
      </div>
    </SceneFade>
  );
};

const Donasi: React.FC = () => {
  const f = useCurrentFrame();
  const len = A.donasi.selesai - A.donasi.mulai;
  const o = A.donasi.mulai;
  const steps: [number, string][] = [
    [E.donasi1 - o, "Buka link di bio"],
    [E.donasi2 - o, "Pilih nominal donasi"],
    [E.donasi3 - o, "Kirim, lalu bagikan video ini"],
  ];
  const line = interpolate(f, [E.donasi1 - o, E.donasi3 - o], [0, 1], clamp);
  return (
    <SceneFade len={len}>
      <Bingkai no={4} />
      <div style={{ position: "absolute", left: X, right: X, top: 480 }}>
        <Land at={E.donasiJudul - o - 6} from={[0, 20]}><Label>Cara ikut mendampingi</Label></Land>
        <Land at={E.donasiJudul - o} style={{ marginTop: 24 }}><Judul size={104}>Donasi dalam tiga langkah</Judul></Land>
        <div style={{ position: "relative", marginTop: 80 }}>
          {/* garis emas yang tumbuh menghubungkan langkah */}
          <div style={{ position: "absolute", left: 54, top: 60, width: 6, height: 380 * line, background: C.emas, borderRadius: 3, opacity: 0.6 }} />
          {steps.map(([at, t], i) => (
            <Land key={t} at={at} from={[-40, 40]} style={{ display: "flex", alignItems: "center", gap: 40, height: 120, marginBottom: 70 }}>
              <div
                style={{
                  width: 114, height: 114, borderRadius: 57, flex: "none", background: C.malam, border: `5px solid ${C.emas}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: ARCHIVO, fontWeight: 900, fontSize: 60, color: C.emas, marginLeft: i === 2 ? 0 : 0,
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 50, lineHeight: 1.2, color: C.krem }}>{t}</div>
            </Land>
          ))}
        </div>
      </div>
    </SceneFade>
  );
};

const Ajakan: React.FC = () => {
  const f = useCurrentFrame();
  const o = A.ajakan.mulai;
  const lf = E.logo - o;
  // Logo terbit dari bawah, mendarat di frame logo (bersama suara buku terbuka).
  const p = interpolate(f, [lf - 14, lf], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const tf = E.tombol - o;
  const pop = interpolate(f, [tf - 6, tf, tf + 5], [0.6, 1.07, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const glowBtn = 0.5 + 0.5 * Math.sin((f - tf) / 6);
  return (
    <AbsoluteFill style={{ opacity: interpolate(f, [0, 8], [0, 1], clamp) }}>
      <Bingkai no={5} />
      <div style={{ position: "absolute", left: X, right: X, top: 500, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ height: 162, overflow: "hidden", padding: "0 0" }}>
          <Img
            src={staticFile("logo-terang.png")}
            style={{ width: 644, height: "auto", opacity: p, transform: `translateY(${(1 - p) * 120}px)` }}
          />
        </div>
        <div style={{ marginTop: 150 }}>
          <Land at={E.ajakanJudul - o}><Judul size={104}>Bantu buka cakrawala</Judul></Land>
          <Land at={E.ajakanAksen - o}><Aksen size={176} style={{ marginTop: -4 }}>mereka.</Aksen></Land>
        </div>
        <div
          style={{
            marginTop: 90, transform: `scale(${pop})`, opacity: interpolate(f, [tf - 6, tf - 3], [0, 1], clamp),
            background: C.oranye, color: C.krem, borderRadius: 999, padding: "34px 56px",
            fontFamily: INTER, fontWeight: 600, fontSize: 44,
            boxShadow: `0 14px 40px rgba(231,94,25,${0.25 + 0.2 * glowBtn})`,
          }}
        >
          Donasi lewat link di bio →
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ video
const S: React.FC<{ k: keyof typeof A; children: React.ReactNode }> = ({ k, children }) => (
  <Sequence from={A[k].mulai} durationInFrames={A[k].selesai - A[k].mulai}>{children}</Sequence>
);

export const Video: React.FC = () => (
  <AbsoluteFill style={{ background: C.malam }}>
    <Langit />
    <S k="hook"><Hook /></S>
    <S k="kebutuhan"><Kebutuhan /></S>
    <S k="program"><Program /></S>
    <S k="donasi"><Donasi /></S>
    <S k="ajakan"><Ajakan /></S>
    <Grain />
    <Audio src={staticFile("audio.wav")} />
  </AbsoluteFill>
);
