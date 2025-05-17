import connect2db from "./db/connection.js";
import errorHandlingMiddleware from "./middlewares/errorHandling.middleware.js";
import cors from "cors";
import videoController from "./modules/video/video.controller.js";
import voiceController from "./modules/voiceover/voiceover.controller.js";
import scriptController from "./modules/script/script.controller.js";
import authController from "./modules/auth/auth.controller.js";
import aiAvatarController from "./modules/aiAvatar/aiAvatar.controller.js";
import userController from "./modules/user/user.controller.js";
import testingController from "./modules/testing/testing.controller.js";
import path from "node:path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import session from "express-session";
import passport from "./utils/passport/passport.js";

const bootstrap = (app, express) => {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "mySuperSecretKey123",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(express.json());
  app.use(cors({ origin: "*" }));
  app.use(morgan("dev"));
  app.use(cookieParser());
  // Serve the videos directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  app.use("/videos", express.static(path.join(__dirname, "../videos")));

  app.use("/api/auth", authController);
  app.use("/api/videos", videoController);
  app.use("/api/voices", voiceController);
  app.use("/api/scripts", scriptController);
  app.use("/api/aiAvatar", aiAvatarController);
  app.use("/api/user", userController);
  app.use("/api/testing", testingController);

  app.get("", (req, res, next) => {
    return res.status(200).json({ message: `${process.env.APP_NAME}` });
  });

  app.all("*", (req, res) => {
    return res.status(404).json({ message: "Invalid routing" });
  });

  app.use(errorHandlingMiddleware);

  connect2db();
};

export default bootstrap;
