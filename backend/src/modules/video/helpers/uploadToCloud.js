import * as fs from "node:fs";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";

const uploadToCloud = async ({ req, title, outputLocation }) => {
    const postfix = `${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const cloudUploadResult = await cloud.uploader.upload(outputLocation, {
        folder: `${process.env.APP_NAME}/${req.user._id}/${title}_${postfix}`,
        resource_type: "auto",
    });

    if (!cloudUploadResult) {
        next(
            new Error(
                "An error occured while uploading the video into the cloud provider"
            )
        );
    }

    console.log("Video uploading completed!");

    fs.unlinkSync(outputLocation);

    return cloudUploadResult
}

export default uploadToCloud