import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { z } from "zod";

export const schema = z.object({
  audioSrc: z.string(),
  captions: z.array(z.string()),
  imagePaths: z.array(z.string()),
  durationSeconds: z.number(),
});

type Props = z.infer<typeof schema>;

// ── Image de fond avec Ken Burns ────────────────────────────────────────────

const BackgroundImage: React.FC<{
  src: string;
  direction: "zoom-in" | "zoom-out";
  totalFrames: number;
}> = ({ src, direction, totalFrames }) => {
  const frame = useCurrentFrame();

  const scale = interpolate(
    frame,
    [0, totalFrames],
    direction === "zoom-in" ? [1, 1.12] : [1.12, 1],
    { extrapolateRight: "clamp" }
  );

  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [totalFrames - 12, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      />
      {/* Overlay dégradé sombre pour lisibilité des captions */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ── Fallback fond si pas d'image ─────────────────────────────────────────────

const GradientBackground: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "linear-gradient(160deg, #1a0a00 0%, #3d1a00 50%, #1a0a00 100%)",
    }}
  />
);

// ── Caption animée ───────────────────────────────────────────────────────────

const Caption: React.FC<{ text: string; totalFrames: number }> = ({
  text,
  totalFrames,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 8, totalFrames - 8, totalFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(frame, [0, 10], [18, 0], {
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [0, 8], [0.9, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 60px 140px 60px",
      }}
    >
      <p
        style={{
          fontSize: 68,
          fontWeight: 900,
          color: "white",
          textAlign: "center",
          lineHeight: 1.2,
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
          textShadow:
            "0 2px 8px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.5)",
          fontFamily: "'Arial Black', 'Impact', sans-serif",
          letterSpacing: "-0.5px",
        }}
      >
        {text}
      </p>
    </AbsoluteFill>
  );
};

// ── Composition principale ───────────────────────────────────────────────────

export const FacebookVideo: React.FC<Props> = ({
  audioSrc,
  captions,
  imagePaths,
  durationSeconds,
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  const hasImages = imagePaths.length > 0;
  const framesPerImage = hasImages
    ? Math.ceil(durationInFrames / imagePaths.length)
    : durationInFrames;

  const framesPerCaption =
    captions.length > 0 ? Math.floor(durationInFrames / captions.length) : durationInFrames;

  return (
    <AbsoluteFill>
      {/* ── Fond : images séquentielles ou dégradé ── */}
      {hasImages ? (
        imagePaths.map((imgPath, i) => (
          <Sequence
            key={i}
            from={i * framesPerImage}
            durationInFrames={framesPerImage + 12} // overlap pour fondu
          >
            <BackgroundImage
              src={imgPath}
              direction={i % 2 === 0 ? "zoom-in" : "zoom-out"}
              totalFrames={framesPerImage + 12}
            />
          </Sequence>
        ))
      ) : (
        <GradientBackground />
      )}

      {/* ── Audio voix off ── */}
      {audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}

      {/* ── Captions séquentielles ── */}
      {captions.map((text, i) => (
        <Sequence key={i} from={i * framesPerCaption} durationInFrames={framesPerCaption}>
          <Caption text={text} totalFrames={framesPerCaption} />
        </Sequence>
      ))}

      {/* ── Barre de progression ── */}
      <ProgressBar />
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  return (
    <AbsoluteFill
      style={{ display: "flex", alignItems: "flex-end", padding: "0 0 40px 0" }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: 5,
          background: "linear-gradient(90deg, #E8840A, #F5A623)",
          borderRadius: 3,
        }}
      />
    </AbsoluteFill>
  );
};
