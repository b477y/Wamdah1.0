import mongoose from "mongoose";
import { generateHash } from "../../utils/security/hash.security.js";
import { UserRole } from "../../utils/enum/enums.js";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePicture: {
      secure_url: { type: String },
      public_id: { type: String },
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    googleTokens: {
      access_token: String,
      refresh_token: String,
      scope: String,
      token_type: String,
      expiry_date: Number,
    },
    aiCredits: { type: Number, default: 25 },
    deletedAt: Date,
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await generateHash({ plaintext: this.password });
  }

  next();
});

const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
export default UserModel;
