import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

export const schema = z.object({
  script: z.string(),
  audioSrc: z.string(),
  durationSeconds: z.number(),
});

type Props = z.infer<typeof schema>;

export const TikTokVideo: React.FC<Props> = ({ script, audioSrc }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fade in/out global
  const opacity = interpolate(
    frame,
    [0, fps * 0.4, durationInFrames - fps * 0.4, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Karaoke — affiche 5 mots à la fois, synchronisé sur la durée totale
  const words = script.split(/\s+/);
  const wordsPerSegment = 5;
  const segmentCount = Math.ceil(words.length / wordsPerSegment);
  const framesPerSegment = durationInFrames / segmentCount;
  const currentSegment = Math.min(
    Math.floor(frame / framesPerSegment),
    segmentCount - 1
  );
  const currentText = words
    .slice(
      currentSegment * wordsPerSegment,
      (currentSegment + 1) * wordsPerSegment
    )
    .join(" ");

  // Pop animation à chaque nouveau segment
  const segmentFrame = frame - currentSegment * framesPerSegment;
  const scale = interpolate(segmentFrame, [0, 6], [0.82, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0d0d0d 0%, #1a1a2e 50%, #16213e 100%)",
        opacity,
      }}
    >
      {/* Audio voix clonée */}
      <Audio src={staticFile(audioSrc)} />

      {/* Sous-titre karaoke centré */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 60px",
        }}
      >
        <p
          style={{
            fontSize: 74,
            fontWeight: 900,
            color: "white",
            textAlign: "center",
            lineHeight: 1.25,
            transform: `scale(${scale})`,
            textShadow: "0 0 30px rgba(255,255,255,0.15), 0 4px 20px rgba(0,0,0,0.8)",
            fontFamily: "'Arial Black', sans-serif",
            letterSpacing: "-1px",
          }}
        >
          {currentText}
        </p>
      </AbsoluteFill>

      {/* Barre de progression en bas */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "flex-end",
          padding: "0 0 60px 0",
        }}
      >
        <div
          style={{
            width: `${(frame / durationInFrames) * 100}%`,
            height: 6,
            background: "linear-gradient(90deg, #ff0050, #ff4081)",
            borderRadius: 3,
            transition: "width 0.1s linear",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
