import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  image: {
    type: String,
  },
  emailVerified: {
    type: Date,
  },
  // Google OAuth相关字段
  googleId: {
    type: String,
    unique: true,
    sparse: true, // 允许null值，但如果有值必须唯一
  },
  // 用户创建时间
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // 最后登录时间
  lastLoginAt: {
    type: Date,
    default: Date.now,
  },
});

// 创建索引
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);