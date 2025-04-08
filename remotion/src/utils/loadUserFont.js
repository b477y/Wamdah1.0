const { getAvailableFonts } = require("@remotion/google-fonts");

// Retrieve the list of available fonts
const availableFonts = getAvailableFonts();
console.log(availableFonts);

// // Function to load a user-specified font
// const loadUserFont = async (fontFamily) => {
//   const font = availableFonts.find((f) => f.fontFamily === fontFamily);

//   if (!font) {
//     console.error(`❌ Font ${fontFamily} is not found in availableFonts.`);
//     return null;
//   }

//   if (!font.importName) {
//     console.error(`❌ Font ${fontFamily} exists but has no importName.`);
//     return null;
//   }

//   // Log the full font object to understand its structure
//   console.log(`🧠 Font Details:`);
//   console.log(`Font Family: ${fontFamily}`);
//   console.log(`Import Name: ${font.importName}`);
//   console.log(`Font Object: `, font);
//   console.log(`Font Load Function: `, font.load);

//   try {
//     // Log the dynamic import of the font
//     console.log(`Attempting to load font module for: ${font.importName}`);
//     const fontModule = require(`@remotion/google-fonts/${font.importName}`);

//     // Log what we have received from the dynamic import
//     console.log(`Font Module: `, fontModule);

//     if (fontModule?.loadFont) {
//       fontModule.loadFont();
//       console.log(`✅ ${fontFamily} loaded successfully.`);
//       return fontFamily;
//     } else {
//       console.error(`❌ ${fontFamily} does not have a valid loadFont function.`);
//       return null;
//     }
//   } catch (error) {
//     console.error(`❌ Error loading ${fontFamily}:`, error);
//     return null;
//   }
// };

// loadUserFont("ABeeZee");

module.exports = { loadUserFont };
