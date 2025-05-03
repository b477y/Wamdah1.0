import asyncHandler from "../../../utils/response/error.response.js";
import UserModel from "../../../db/models/User.model.js";
import successResponse from "../../../utils/response/success.response.js";
import { TokenType } from "../../../utils/enum/enums.js";
import { compareHash } from "../../../utils/security/hash.security.js";
import {
  generateTokens,
  decodeToken,
} from "../../../utils/security/token.security.js";
import { google } from "googleapis";

export const signUp = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const user = await UserModel.findOne({
    email,
    deletedAt: { $exists: false },
  });

  if (user) {
    return next(new Error("Email already exists", { cause: 409 }));
  }

  const accessTokenSK = process.env.ACCESS_TOKEN_SK;
  const refreshTokenSK = process.env.REFRESH_TOKEN_SK;

    const newUser = await UserModel.create({ ...req.body });

  const tokens = await generateTokens({
    payload: { _id: newUser._id, role: newUser.role },
    accessTokenSK,
    refreshTokenSK,
    tokenType: [TokenType.ACCESS, TokenType.REFRESH],
  });

  return successResponse({
    res,
    status: 201,
    message: "Account created successfully.",
    data: { tokens },
  });
});

export const signIn = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await UserModel.findOne({
    email,
    deletedAt: { $exists: false },
  });

  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  const isMatch = await compareHash({
    plaintext: password,
    encryptedText: user.password,
  });

  if (!isMatch) {
    return next(new Error("Invalid credentials", { cause: 400 }));
  }

  const accessTokenSK = process.env.ACCESS_TOKEN_SK;
  const refreshTokenSK = process.env.REFRESH_TOKEN_SK;

  const tokens = await generateTokens({
    payload: { _id: user._id, role: user.role },
    accessTokenSK,
    refreshTokenSK,
    tokenType: [TokenType.ACCESS, TokenType.REFRESH],
  });

  return successResponse({
    res,
    status: 200,
    message: "Logged in successfully",
    data: { tokens },
  });
});

export const refreshToken = asyncHandler(async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return next(new Error("Authorization header is required", { cause: 401 }));
  }

  const user = await decodeToken({
    authorization,
    tokenType: TokenType.REFRESH,
  });

  if (!user || !user._id || !user.role) {
    return next(new Error("Invalid or expired refresh token", { cause: 401 }));
  }

  let accessTokenSK = process.env.ACCESS_TOKEN_SK;
  let refreshTokenSK = process.env.REFRESH_TOKEN_SK;

  const tokens = await generateTokens({
    payload: { _id: user._id, role: user.role },
    accessTokenSK,
    refreshTokenSK,
    tokenType: [TokenType.ACCESS, TokenType.REFRESH],
  });

  return successResponse({
    res,
    status: 200,
    message: "Tokens refreshed successfully",
    data: { tokens },
  });
});
// export const oauth = asyncHandler(async (req, res, next) => {
//   const { code } = req.query;

//   if (!code) {
//     return next(new Error("Authorization code is required", { cause: 400 }));
//   }

//   const oauth2Client = new google.auth.OAuth2(
//     process.env.CLIENT_ID,
//     process.env.CLIENT_SECRET,
//     process.env.REDIRECT_URI
//   );

//   try {
//     const { tokens } = await oauth2Client.getToken(code);
//     oauth2Client.setCredentials(tokens);

//     const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
//     const { data: userInfo } = await oauth2.userinfo.get();
//     const { email } = userInfo;

//     if (!email) {
//       return next(new Error("Google account doesn't have an email", { cause: 400 }));
//     }

//     let user = await UserModel.findOne({ email, deletedAt: { $exists: false } });

//     if (!user) {
//       user = await UserModel.create({
//         email,
//         googleTokens: tokens,
//       });
//     } else {
//       user.googleTokens = tokens;
//       await user.save();
//     }

//     const accessTokenSK = process.env.ACCESS_TOKEN_SK;
//     const refreshTokenSK = process.env.REFRESH_TOKEN_SK;

//     const platformTokens = await generateTokens({
//       payload: { _id: user._id, role: user.role },
//       accessTokenSK,
//       refreshTokenSK,
//       tokenType: [TokenType.ACCESS, TokenType.REFRESH],
//     });

//     // 👇 Redirect to your frontend with tokens in query params (use a secure method in production)
//     const redirectUrl = `${process.env.FRONTEND_REDIRECT_URL}?accessToken=${platformTokens.accessToken}&refreshToken=${platformTokens.refreshToken}`;
//     return res.redirect(redirectUrl);

//   } catch (err) {
//     return next(new Error("Failed to authenticate with Google", { cause: 500 }));
//   }
// });
