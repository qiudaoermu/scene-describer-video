import mongoose from 'mongoose';

const VideoDescriptionSchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: true,
    index: true
  },
  videoTitle: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  userQuery: {
    type: String,
    required: true
  },
  aiDescription: {
    type: String,
    required: true
  },
  // 添加用户ID字段
  userId: {
    type: String,
    required: true,
    index: true
  },
  // 用户邮箱（冗余字段，便于查询）
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
VideoDescriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create compound indexes for efficient queries
VideoDescriptionSchema.index({ videoId: 1, createdAt: -1 });
VideoDescriptionSchema.index({ userId: 1, createdAt: -1 });
VideoDescriptionSchema.index({ userEmail: 1, createdAt: -1 });
VideoDescriptionSchema.index({ videoId: 1, userId: 1 });

export default mongoose.models.VideoDescription || mongoose.model('VideoDescription', VideoDescriptionSchema);