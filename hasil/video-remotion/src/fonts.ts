import { continueRender, delayRender, staticFile } from "remotion";

// Font disimpan lokal (public/fonts) supaya render tidak bergantung internet.
export const ARCHIVO = "Archivo";
export const SERIF = "Instrument Serif";
export const INTER = "Inter";

const fonts: [string, string, FontFaceDescriptors][] = [
  [ARCHIVO, "fonts/Archivo.woff2", { weight: "100 900" }],
  [SERIF, "fonts/InstrumentSerif-Italic.woff2", { style: "italic", weight: "400" }],
  [INTER, "fonts/Inter.woff2", { weight: "100 900" }],
];

const handle = delayRender("Memuat font");
Promise.all(
  fonts.map(([family, file, desc]) => {
    const face = new FontFace(family, `url(${staticFile(file)}) format("woff2")`, desc);
    document.fonts.add(face);
    return face.load();
  }),
)
  .then(() => continueRender(handle))
  .catch((err) => {
    console.error(err);
    continueRender(handle);
  });
