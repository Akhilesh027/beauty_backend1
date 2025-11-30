// models/Banner.js
const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  imageUrl: { type: String, required: true },
  navigateTo: { type: String, required: true },
  section: { type: String, required: false, default: 'default' },  // New: for banner grouping
});

module.exports = mongoose.model('Banner', bannerSchema);
