import mongoose from 'mongoose';

const doctorVerificationCacheSchema = new mongoose.Schema({
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['verified', 'unverified', 'manual_review', 'error'],
    default: 'manual_review',
  },
  verificationDetails: {
    valid: Boolean,
    name: String,
    council: String,
    qualification: String,
    registrationStatus: String,
    registrationNumber: String,
    stateCouncil: String,
  },
  source: {
    type: String,
    enum: ['nmc_api', 'nmc_scrape', 'manual'],
  },
  rawData: mongoose.Schema.Types.Mixed,
  verificationAttempts: {
    nmcApi: {
      attempted: Boolean,
      success: Boolean,
      error: String,
      timestamp: Date,
    },
    nmcScrape: {
      attempted: Boolean,
      success: Boolean,
      error: String,
      timestamp: Date,
    },
  },
  adminNotes: String,
  adminReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  adminReviewedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  },
}, {
  timestamps: true,
});

doctorVerificationCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

export default mongoose.models.DoctorVerificationCache || mongoose.model('DoctorVerificationCache', doctorVerificationCacheSchema);
