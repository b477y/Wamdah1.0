import path from "node:path";
import express from "express";
import bootstrap from "./src/app.controller.js";
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve("./src/config/.env") });
import './passport.js';
import passport from "passport";

const app = express();
const PORT = process.env.PORT;
app.use(passport.initialize());
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
  
});

bootstrap(app, express);