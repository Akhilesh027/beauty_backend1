// models/Package.js
const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  services: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      name: String  // optional: denormalize product name for convenience
    }
  ],
  amount: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Package', PackageSchema);
