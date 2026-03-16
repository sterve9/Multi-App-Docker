import { registerRoot, Composition } from "remotion";
import { KenBurns } from "./KenBurns";

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="KenBurns"
        component={KenBurns}
        durationInFrames={750} // overridden at render time
        fps={25}
        width={1920}
        height={1080}
        defaultProps={{
          imageSrc: "",
          direction: 0,
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
