require("@babel/register")({
  extensions: [".js", ".jsx"],
  presets: ["@babel/preset-env", "@babel/preset-react"],
});

const { renderMedia, getCompositions } = require("@remotion/renderer");
const { bundle } = require("@remotion/bundler");
const path = require("path");

const scriptText = process.argv[2] || "Default script text";
console.log("Rendering with scriptText:", scriptText);

(async () => {
  try {
    const bundled = await bundle(path.resolve(__dirname, "./index.jsx"));

    const compositions = await getCompositions(bundled);
    const composition = compositions.find((c) => c.id === "MyVideo");

    if (!composition) {
      throw new Error("Composition 'MyVideo' not found!");
    }

    console.log("Composition found. Rendering video with inputProps:", {
      scriptText,
    });

    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation: "./output/video.mp4",
      inputProps: { scriptText },
      forcedProps: { scriptText },
    });

    console.log("Video rendering completed successfully!");
  } catch (error) {
    console.error("Error rendering video:", error);
  }
})();
