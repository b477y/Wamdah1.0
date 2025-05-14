import VideoModel from "../../../db/models/Video.model.js";
import asyncHandler from "../../../utils/response/error.response.js";
import successResponse from "../../../utils/response/success.response.js";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";
import UserModel from "../../../db/models/User.model.js";
import { emailEvent } from "../../../utils/events/email.event.js";
import CreditTransactionModel from "../../../db/models/CreditTransaction.model.js";

export const getUserVideos = asyncHandler(async (req, res, next) => {
  const videos = await VideoModel.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  if (!videos.length) { return next(new Error("There are no videos to display", { cause: 404 })) }
  return successResponse({ res, status: 200, message: "User's videos retrieved successfully", data: { videos } });
});

export const renameVideoTitle = asyncHandler(async (req, res, next) => {
  const { videoId, newTitle } = req.body;
  const video = await VideoModel.findById(videoId);
  if (!video) { return next(new Error("Video not found")); }
  const oldPublicId = video.videoSource.public_id;
  const folderPath = oldPublicId.split("/").slice(0, -1).join("/");
  const newPublicId = `${folderPath}/${newTitle}`;
  const result = await cloud.uploader.rename(oldPublicId, newPublicId, { resource_type: "video", overwrite: true, });
  video.videoSource.public_id = result.public_id;
  video.videoSource.secure_url = result.secure_url;
  video.title = newTitle;
  await video.save();
  return successResponse({ res, status: 200, message: "Video renamed successfully", data: { video }, });
});

export const getRecentVideos = asyncHandler(async (req, res, next) => {
  const videos = await VideoModel.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).limit(3);
  if (!videos.length) { return next(new Error("There are no videos to display", { cause: 404 })) }
  return successResponse({ res, status: 200, message: "Last 3 videos retrieved successfully", data: { videos }, });
});

export const getUserVideosCount = asyncHandler(async (req, res, next) => {
  const videosCount = await VideoModel.find({
    createdBy: req.user._id,
  }).countDocuments();
  successResponse({
    res,
    status: 200,
    message: "Videos count retrieved successfully",
    data: { videosCount },
  });
});

export const getAiCredits = asyncHandler(async (req, res, next) => {
  const aiCredits = await UserModel.findById(req.user._id).select("aiCredits");

  successResponse({
    res,
    status: 200,
    message: "Ai credits retrieved successfully",
    data: { aiCredits },
  });
});

export const getUserDashboard = asyncHandler(async (req, res, next) => {
  const { name } = await UserModel.findById(req.user._id).select("name");
  const videos = await VideoModel.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).limit(3);
  const aiCredits = await UserModel.findById(req.user._id).select("aiCredits");
  const videosCount = await VideoModel.find({ createdBy: req.user._id }).countDocuments();
  successResponse({
    res, status: 200, message: "User's data retrieved successfully", data: { name, aiCredits, videosCount, videos },
  });
});

export const downloadVideo = asyncHandler(async (req, res, next) => {
  const { videoId } = req.body;
  const video = await VideoModel.findById(videoId);
  if (!video) { return next(new Error("Video not found")); }
  const videoUrl = video.videoSource.secure_url;
  res.setHeader("Content-Disposition", `attachment; filename="${video.title}.mp4"`);
  res.redirect(videoUrl);
});

export const getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id).select(
    "name email aiCredits"
  );
  const payments = await CreditPurchaseModel.find({ userId: user._id }).select(
    "credits egpAmount paymentProvider paymentReference status -_id"
  );
  return successResponse({
    res,
    status: 200,
    message: "User's profile retrieved successfully",
    data: { user, payments },
  });
});

export const purchaseCredits = asyncHandler(async (req, res, next) => {
  const { credits } = req.body;
  if (typeof credits !== 'number' || credits <= 0) { return next(new Error('Credits must be a positive number.')); }
  const egpAmount = credits * 2;
  const user = await UserModel.findByIdAndUpdate(req.user._id, { $inc: { aiCredits: credits } }, { new: true });
  const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  await CreditTransactionModel.create({ userId: req.user._id, credits, egpAmount, paymentReference, status: "Success" })
  emailEvent.emit("sendPurchaseConfirmation", { email: user.email, name: user.name, credits });
  return successResponse({ res, status: 200, message: "AI credits added successfully" });
});