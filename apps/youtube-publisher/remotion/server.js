const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3001;

// Lazy-loaded Remotion renderer
let bundle = null;

async function getBundle() {
  if (bundle) return bundle;
  const { bundle: createBundle } = await import("@remotion/bundler");
  console.log("Bundling Remotion composition...");
  bundle = await createBundle({
    entryPoint: path.join(__dirname, "src", "index.tsx"),
    webpackOverride: (config) => config,
  });
  console.log("Bundle ready.");
  return bundle;
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * POST /render
 * Body: {
 *   image_path: string,   // absolute path on shared volume
 *   duration_ms: number,  // clip duration in milliseconds
 *   output_path: string,  // absolute path for output MP4
 *   direction?: number    // Ken Burns direction 0|1|2 (optional)
 * }
 */
app.post("/render", async (req, res) => {
  const { image_path, duration_ms, output_path, direction = 0 } = req.body;

  if (!image_path || !duration_ms || !output_path) {
    return res.status(400).json({ error: "image_path, duration_ms et output_path sont requis" });
  }

  if (!fs.existsSync(image_path)) {
    return res.status(400).json({ error: `Image non trouvée : ${image_path}` });
  }

  const fps = 25;
  const durationInFrames = Math.max(25, Math.round((duration_ms / 1000) * fps));

  // Ensure output directory exists
  const outputDir = path.dirname(output_path);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const bundlePath = await getBundle();
    const { renderMedia, selectComposition } = await import("@remotion/renderer");

    const composition = await selectComposition({
      serveUrl: bundlePath,
      id: "KenBurns",
      inputProps: { imageSrc: `file://${image_path}`, direction },
    });

    await renderMedia({
      composition: {
        ...composition,
        durationInFrames,
        fps,
        width: 1920,
        height: 1080,
      },
      serveUrl: bundlePath,
      codec: "h264",
      outputLocation: output_path,
      inputProps: { imageSrc: `file://${image_path}`, direction },
      chromiumOptions: {
        disableWebSecurity: true,
      },
      envVariables: {},
      timeoutInMilliseconds: 120000,
    });

    console.log(`Rendered: ${output_path} (${durationInFrames} frames)`);
    res.json({ success: true, output_path });
  } catch (err) {
    console.error("Remotion render error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`Remotion renderer listening on port ${PORT}`);
  // Pre-warm the bundle on startup
  getBundle().catch((err) => console.error("Bundle pre-warm failed:", err));
});
