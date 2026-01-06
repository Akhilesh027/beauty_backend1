const mongoose = require('mongoose');

const referralHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  reward: {
    type: Number,
    default: 100
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  }
});

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,

  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  age: {
    type: Number,
    min: 0,
    max: 120
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say', ''],
    default: ''
  },
  referralCode: {
    type: String,
    unique: true,
    uppercase: true,
    required: true,
    index: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  referralCodeUsed: {
    type: String,
    uppercase: true,
    default: null
  },
  referralCount: {
    type: Number,
    default: 0
  },
  referrals: [referralHistorySchema],
  referralClicks: {
    type: Number,
    default: 0
  },
  referralSources: {
    type: Map,
    of: Number,
    default: {}
  },
  wallet: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEarned: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  profilePicture: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  lastActive: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName || ''}`.trim();
});

userSchema.index({ email: 1 });

userSchema.index({ referralCode: 1 });
userSchema.index({ referredBy: 1 });
userSchema.index({ wallet: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ referralCount: -1 });


module.exports = mongoose.model('User', userSchema);