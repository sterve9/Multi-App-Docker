import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Img } from "remotion";

interface KenBurnsProps {
  imageSrc: string;
  // Ken Burns direction: 0=zoom-in center, 1=zoom-in top-left, 2=zoom-in bottom-right
  direction?: number;
}

export const KenBurns: React.FC<KenBurnsProps> = ({ imageSrc, direction = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const progress = frame / durationInFrames;

  // Zoom: 1.0 → 1.08 (subtle, cinematic)
  const scale = interpolate(progress, [0, 1], [1.0, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pan direction based on variant
  const panX =
    direction === 1
      ? interpolate(progress, [0, 1], [0, -3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : direction === 2
      ? interpolate(progress, [0, 1], [0, 3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : 0;

  const panY =
    direction === 1
      ? interpolate(progress, [0, 1], [0, -2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : direction === 2
      ? interpolate(progress, [0, 1], [0, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : 0;

  // Fade in first 12 frames, fade out last 12 frames
  const opacity = interpolate(
    frame,
    [0, 12, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          opacity,
          transform: `scale(${scale}) translate(${panX}%, ${panY}%)`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={imageSrc}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
