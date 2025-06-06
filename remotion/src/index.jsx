import { registerRoot } from "remotion";
import { Composition } from "remotion";
import MyVideo from "./components/MyVideo.jsx";

const FRAMES_PER_SENTENCE = 80;
const DEFAULT_TEXT = "Welcome to Remotion! This is an example. Enjoy your video.";

const sentenceCount = DEFAULT_TEXT.split(/[.?!]\s+/).filter(Boolean).length;
const totalFrames = sentenceCount * FRAMES_PER_SENTENCE;

const RemotionRoot = () => {
    return (
        <Composition
            id="MyVideo"
            component={MyVideo}
            durationInFrames={7200} // Dynamically calculated
            fps={30}
            width={1080}
            height={1920}
            defaultProps={{ scriptText: DEFAULT_TEXT }}
        />
    );
};

registerRoot(RemotionRoot);
