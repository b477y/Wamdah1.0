import { registerRoot } from "remotion";
import React from "react";
import { Composition } from "remotion";
import MyVideo from "./components/MyVideo.jsx";

const RemotionRoot = () => {
    return (
        <Composition
            id="MyVideo"
            component={MyVideo}
            durationInFrames={1800} // 60s * 30fps
            fps={30}
            width={1920}
            height={1080}
        />
    );
};

registerRoot(RemotionRoot);
