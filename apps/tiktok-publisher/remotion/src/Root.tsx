import { Composition } from "remotion";
import { TikTokVideo, schema } from "./TikTokVideo";

export const Root = () => {
  return (
    <Composition
      id="TikTokVideo"
      component={TikTokVideo}
      durationInFrames={1800} // 60s × 30fps par défaut
      fps={30}
      width={1080}
      height={1920}
      schema={schema}
      defaultProps={{
        script: "Tu veux créer un business avec l'IA mais tu sais pas par où commencer ? Regarde ça.",
        audioSrc: "",
        durationSeconds: 60,
      }}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.durationSeconds * 30,
      })}
    />
  );
};
