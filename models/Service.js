const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['home', 'salon', 'wellness', 'other']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  bookings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create text index for search functionality
serviceSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Service', serviceSchema);