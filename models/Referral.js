// models/Referral.js
const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referralCode: { type: String, required: true },
  totalReferrals: { type: Number, default: 0 },
  successfulReferrals: { type: Number, default: 0 },
  pendingReferrals: { type: Number, default: 0 },
  earnedCredits: { type: Number, default: 0 },
  history: [
    {
      name: String,
      date: Date,
      status: { type: String, enum: ['Success', 'Pending'], default: 'Pending' },
      credit: Number
    }
  ]
});

module.exports = mongoose.model('Referral', ReferralSchema);

