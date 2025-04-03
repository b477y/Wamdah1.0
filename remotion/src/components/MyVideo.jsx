import React from "react";
import { AbsoluteFill, Sequence, Audio } from "remotion";

const FRAMES_PER_SENTENCE = 150;

const MyVideo = ({ sentences = ["No text provided"], fontSize = 80, color = "white", fontFamily = "Arial", voiceoverUrl }) => {
    console.log("📢 MyVideo received:", { sentences, voiceoverUrl });

    return (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "black" }}>
            {/* Add Voiceover if provided */}
            {voiceoverUrl && <Audio src={voiceoverUrl} />}

            {sentences.map((sentence, index) => (
                <Sequence key={index} from={index * FRAMES_PER_SENTENCE} durationInFrames={FRAMES_PER_SENTENCE}>
                    <h1
                        style={{
                            fontSize,
                            color,
                            fontFamily,
                            textAlign: "center",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            width: "100%",
                            height: "100%",
                        }}
                    >
                        {sentence}
                    </h1>
                </Sequence>
            ))}
        </AbsoluteFill>
    );
};

export default MyVideo;
