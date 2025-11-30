const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Beauty', 'Wellness', 'Training', 'Business', 'Other']
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
  image: {
    type: String,
    default: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60'
  },
  rating: {
    type: Number,
    default: 4.5,
    min: 0,
    max: 5
  },
  students: {
    type: Number,
    default: 0
  },
  enrolledStudents: {
    type: Number,
    default: 0
  },
  instructor: {
    name: String,
    bio: String,
    image: String
  },
  curriculum: [{
    week: Number,
    title: String,
    description: String,
    topics: [String]
  }],
  prerequisites: [String],
  whatYouWillLearn: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  language: {
    type: String,
    default: 'English'
  },
  certificate: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
courseSchema.index({ category: 1, isActive: 1 });
courseSchema.index({ rating: -1 });

module.exports = mongoose.model('Course', courseSchema);
