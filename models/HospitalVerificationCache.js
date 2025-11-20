import mongoose from 'mongoose';

const hospitalVerificationCacheSchema = new mongoose.Schema({
  hospitalId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  alternateIdentifiers: {
    registrationNumber: String,
    nabhCertificateNumber: String,
    abdmFacilityId: String,
  },
  status: {
    type: String,
    enum: ['verified', 'unverified', 'manual_review', 'error'],
    default: 'manual_review',
  },
  verificationDetails: {
    valid: Boolean,
    name: String,
    state: String,
    district: String,
    hospitalType: String,
    beds: Number,
    accreditation: [String],
    registrationStatus: String,
    nabhStatus: String,
    abdmStatus: String,
  },
  source: {
    type: String,
    enum: ['abdm_api', 'nabh_scrape', 'nabhdb_scrape', 'manual'],
  },
  rawData: mongoose.Schema.Types.Mixed,
  verificationAttempts: {
    abdmApi: {
      attempted: Boolean,
      success: Boolean,
      error: String,
      timestamp: Date,
    },
    nabhScrape: {
      attempted: Boolean,
      success: Boolean,
      error: String,
      timestamp: Date,
    },
    nabhdbScrape: {
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

hospitalVerificationCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

export default mongoose.models.HospitalVerificationCache || mongoose.model('HospitalVerificationCache', hospitalVerificationCacheSchema);
