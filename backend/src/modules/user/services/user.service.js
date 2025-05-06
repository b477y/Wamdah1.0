import VideoModel from "../../../db/models/Video.model.js";
import asyncHandler from "../../../utils/response/error.response.js";
import successResponse from "../../../utils/response/success.response.js";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";
import UserModel from "../../../db/models/User.model.js";
import { emailEvent } from "../../../utils/events/email.event.js";

export const getUserVideos = asyncHandler(async (req, res, next) => {
  const videos = await VideoModel.find({ createdBy: req.user._id }).sort({
    createdAt: -1,
  });
  successResponse({
    res,
    status: 200,
    message: "User's videos retrieved successfully",
    data: { videos },
  });
});

export const renameVideoTitle = asyncHandler(async (req, res, next) => {
  const { videoId, newTitle } = req.body; // the ID in your DB

  const video = await VideoModel.findById(videoId);
  if (!video) {
    return next(new Error("Video not found"));
  }

  const oldPublicId = video.videoSource.public_id;
  const folderPath = oldPublicId.split("/").slice(0, -1).join("/");

  const newPublicId = `${folderPath}/${newTitle}`;

  const result = await cloud.uploader.rename(oldPublicId, newPublicId, {
    resource_type: "video",
    overwrite: true,
  });

  video.videoSource.public_id = result.public_id;
  video.videoSource.secure_url = result.secure_url;
  video.title = newTitle;
  await video.save();

  successResponse({
    res,
    status: 200,
    message: "Video renamed successfully",
    data: { video },
  });
});

export const getRecentVideos = asyncHandler(async (req, res, next) => {
  const videos = await VideoModel.find({ createdBy: req.user._id })
    .sort({ createdAt: -1 })
    .limit(3);
  successResponse({
    res,
    status: 200,
    message: "Last 3 videos retrieved successfully",
    data: { videos },
  });
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
  const videos = await VideoModel.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).limit(3);
  const aiCredits = await UserModel.findById(req.user._id).select("aiCredits");
  const videosCount = await VideoModel.find({ createdBy: req.user._id }).countDocuments();
  successResponse({
    res, status: 200, message: "User's data retrieved successfully", data: { aiCredits, videosCount, videos },
  });
});

export const downloadVideo = asyncHandler(async (req, res, next) => {
  const { videoId } = req.body;

  const video = await VideoModel.findById(videoId);
  if (!video) {
    return next(new Error("Video not found"));
  }

  const videoUrl = video.videoSource.secure_url;

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${video.title}.mp4"`
  );

  res.redirect(videoUrl);
});

export const getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id).select(
    "name email aiCredits"
  );
  return successResponse({
    res,
    status: 200,
    message: "User's profile retrieved successfully",
    data: user,
  });
});

export const purchaseCredits = asyncHandler(async (req, res, next) => {
  const { credits } = req.body;
  if (typeof credits !== 'number' || credits <= 0) { return next(new Error('Credits must be a positive number.')); }
  const user = await UserModel.findByIdAndUpdate(req.user._id, { $inc: { aiCredits: credits } }, { new: true });
  emailEvent.emit("sendPurchaseConfirmation", { email: user.email, name: user.name, credits: user.credits });
  return successResponse({ res, status: 200, message: "AI credits added successfully" });
});