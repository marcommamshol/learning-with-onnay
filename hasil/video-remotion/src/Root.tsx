import { Composition } from "remotion";
import { Video } from "./Video";
import T from "./timeline.json";

export const RemotionRoot = () => (
  <Composition
    id="Cakrawala"
    component={Video}
    durationInFrames={T.durasi}
    fps={T.fps}
    width={1080}
    height={1920}
  />
);
