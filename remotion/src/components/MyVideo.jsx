import {
  AbsoluteFill,
  Sequence,
  Audio,
  staticFile,
  Img,
  Video,
} from "remotion";
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

const isArabicText = (text) => {
  const arabicPattern =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(text);
};

const loadFont = (fontFamily) => {
  const fontMap = {
    Amiri: loadAmiri,
    Cairo: loadCairo,
    Tajawal: loadTajawal,
    Lateef: loadLateef,
    "Reem Kufi": loadReemKufi,
    Sofia: loadSofia,
    Scheherazade: loadScheherazadeNew,
    "Open Sans": loadOpenSans,
    Roboto: loadRoboto,
    Lato: loadLato,
    Poppins: loadPoppins,
    Montserrat: loadMontserrat,
    Merriweather: loadMerriweather,
    "Slabo 27px": loadSlabo27px,
    ABeeZee: loadABeeZee,
    Lora: loadLora,
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
  const { fontFamily: selectedFont } = fontLoader
    ? fontLoader()
    : { fontFamily: "Arial" };

  const sentenceDuration = 60;
  const totalDuration = sentences.length * sentenceDuration;

  const backgroundImagePaths = [
    "image1.jpg",
    "image2.jpg",
    "image3.jpg",
    "image4.jpg",
    "image5.jpg",
    "image6.jpg",
    "image7.jpg",
    "image8.jpg",
    "image9.jpg",
    "image10.jpg",
    "image11.jpg",
    "image12.jpg",
    "image13.jpg",
    "image14.jpg",
    "image15.jpg",
    "image16.jpg",
    "image17.jpg",
    "image18.jpg",
    "image19.jpg",
    "image20.jpg",
  ]; 

  const aiAvatarPath = fileName ? staticFile(`videos/${fileName}`) : null;
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      {voiceoverUrl && <Audio src={voiceoverUrl} />}

      {/* Avatar Video — only if fileName is provided */}
      {fileName && (
        <Video
          src={aiAvatarPath}
          startFrom={0}
          muted={!!voiceoverUrl}
          style={{
            position: "absolute",
            top: "960px",
            width: "100%",
            height: "960px",
            objectFit: "cover",
            zIndex: 1,
          }}
        />
      )}

      {/* Render Background Images */}
      {backgroundImagePaths.map((imageName, index) => (
        <Sequence
          key={`bg-${index}`}
          from={index * sentenceDuration}
          durationInFrames={sentenceDuration}
        >
          <Img
            src={staticFile(`images/${imageName}`)}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 0,
            }}
          />
        </Sequence>
      ))}

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
                zIndex: 2,
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
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  padding: "0.2em 0.5em",
                  borderRadius: "8px",
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
