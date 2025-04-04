import asyncHandler from "../../../utils/response/error.response.js";
import UserModel from "../../../db/models/User.model.js";
import successResponse from "../../../utils/response/success.response.js";
import { TokenType } from "../../../utils/enum/enums.js";
import { compareHash } from "../../../utils/security/hash.security.js";
import {
  generateTokens,
  decodeToken,
} from "../../../utils/security/token.security.js";

export const signUp = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const user = await UserModel.findOne({
    filter: { email, deletedAt: { $exists: false } },
  });

  if (user) {
    return next(new Error("Email already exists", { cause: 409 }));
  }

  const newUser = await UserModel.create({ ...req.body });

  return successResponse({
    res,
    status: 201,
    message: "Account created successfully.",
    data: newUser,
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