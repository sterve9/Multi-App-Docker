import { Composition } from "remotion";
import { FacebookVideo, schema } from "./FacebookVideo";

export const Root = () => {
  return (
    <Composition
      id="FacebookVideo"
      component={FacebookVideo}
      durationInFrames={750} // 30s × 25fps par défaut
      fps={25}
      width={1080}
      height={1920}
      schema={schema}
      defaultProps={{
        audioSrc: "",
        captions: ["Découvrez le Rituel Ancestral", "5 minutes par jour", "Transformez votre énergie"],
        imagePaths: [],
        durationSeconds: 30,
      }}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.durationSeconds * 25,
      })}
    />
  );
};
