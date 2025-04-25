import { AbsoluteFill, Sequence, Audio, Video, staticFile } from "remotion";
// Arabic Fonts
import { loadFont as loadAmiri } from "@remotion/google-fonts/Amiri";
import { loadFont as loadCairo } from "@remotion/google-fonts/Cairo";
import { loadFont as loadTajawal } from "@remotion/google-fonts/Tajawal";
import { loadFont as loadLateef } from "@remotion/google-fonts/Lateef";
import { loadFont as loadReemKufi } from "@remotion/google-fonts/ReemKufi";
import { loadFont as loadSofia } from "@remotion/google-fonts/Sofia";
import { loadFont as loadScheherazadeNew } from "@remotion/google-fonts/ScheherazadeNew";
// English Fonts
import { loadFont as loadOpenSans } from "@remotion/google-fonts/OpenSans";
import { loadFont as loadRoboto } from "@remotion/google-fonts/Roboto";
import { loadFont as loadLato } from "@remotion/google-fonts/Lato";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadMerriweather } from "@remotion/google-fonts/Merriweather";
import { loadFont as loadSlabo27px } from "@remotion/google-fonts/Slabo27px";
import { loadFont as loadABeeZee } from "@remotion/google-fonts/ABeeZee";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import { loadFont as loadAdventPro } from "@remotion/google-fonts/AdventPro";

// Helper function to detect if text is primarily Arabic
const isArabicText = (text) => {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(text);
};

const loadFont = (fontFamily) => {
  const fontMap = {
    "Amiri": loadAmiri,
    "Cairo": loadCairo,
    "Tajawal": loadTajawal,
    "Lateef": loadLateef,
    "Reem Kufi": loadReemKufi,
    "Sofia": loadSofia,
    "Scheherazade": loadScheherazadeNew,
    "Open Sans": loadOpenSans,
    "Roboto": loadRoboto,
    "Lato": loadLato,
    "Poppins": loadPoppins,
    "Montserrat": loadMontserrat,
    "Merriweather": loadMerriweather,
    "Slabo 27px": loadSlabo27px,
    "ABeeZee": loadABeeZee,
    "Lora": loadLora,
    "Advent Pro": loadAdventPro,
  };

  return fontMap[fontFamily];
};

const MyVideo = ({
  sentences = ["No text provided"],
  fontSize = 80,
  color = "black",
  fontFamily = "Arial",
  voiceoverUrl,
  fileName,
}) => {
  const fontLoader = loadFont(fontFamily);
  const { fontFamily: selectedFont } = fontLoader ? fontLoader() : { fontFamily: "Arial" };

  const sentenceDuration = 120;
  const totalDuration = sentences.length * sentenceDuration;
  
  // Adjust the path to go from the Remotion project to backend/videos
  const aiAvatarPath = staticFile(`videos/${fileName}`);
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      {voiceoverUrl && <Audio src={voiceoverUrl} />}
    
      {/* Avatar Video — rendered once for the full duration */}
      {aiAvatarPath && (
        <Video
          src={aiAvatarPath}
          startFrom={0}
          style={{
            position: "absolute",
            top: "960px",
            width: "100%",
            height: "960px",
            objectFit: "cover",
            zIndex: 0, // Optional — adjust as needed
          }}
        />
      )}

      {/* Render each sentence one by one */}
      {sentences.map((sentence, index) => {
        const isArabic = isArabicText(sentence);
        return (
          <Sequence
            key={index}
            from={index * sentenceDuration}
            durationInFrames={sentenceDuration}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                height: "960px",
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                paddingTop: "300px",
              }}
            >
              <h1
                style={{
                  fontSize,
                  color,
                  fontFamily: selectedFont,
                  textAlign: "center",
                  direction: isArabic ? "rtl" : "ltr",
                  unicodeBidi: "bidi-override",
                }}
              >
                {sentence}
              </h1>
            </div>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export default MyVideo;