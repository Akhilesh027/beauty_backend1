const mongoose = require('mongoose');

const procedureSchema = new mongoose.Schema({
  title: { type: String, required: false },
  desc: { type: String, required: false },
  img: { type: String, required: false }
}, { _id: false });

const faqSchema = new mongoose.Schema({
  question: { type: String, required: false },
  answer: { type: String, required: false }
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Product name is required'], trim: true },
  description: { type: String, trim: true },
  type: { type: String, required: [true, 'Product type is required'], enum: ['salon_for_women', 'spa_for_women', 'hydra_facial', 'pre_bridal'] },
  category: { type: String, required: [true, 'Category is required'] },
  subCategory: { type: String },
  serviceType: { type: String, required: [true, 'Service type is required'], enum: ['home_service', 'clinic_service', 'both'] },
  gender: { type: String, required: [true, 'Gender is required'], enum: ['men', 'women', 'unisex'] },
  sku: { type: String, required: [true, 'SKU is required'], unique: true, trim: true },
  price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
  stock: { type: Number, required: [true, 'Stock is required'], min: [0, 'Stock cannot be negative'] },
  maxStock: { type: Number, required: [true, 'Max stock is required'], min: [0, 'Max stock cannot be negative'] },

  overview: { type: [String], default: [] },
  thingsToKnow: { type: [String], default: [] },
  precautions: { type: [String], default: [] },
  faqs: { type: [faqSchema], default: [] },
  procedure: { type: [procedureSchema], default: [] },

  image: { type: String },
  oldPrice: { type: Number, min: [0, 'Old price cannot be negative'] },
  discount: { type: Number, min: [0, 'Discount cannot be negative'], max: [100, 'Discount cannot exceed 100%'] },
  rating: { type: Number, default: 4.8, min: [0, 'Rating cannot be negative'], max: [5, 'Rating cannot exceed 5'] },
  time: { type: String, default: '60 mins' },
  tag: { type: String },
  status: { type: String, enum: ['active', 'low', 'out'], default: 'active' }
}, { timestamps: true });

// Status update before save
productSchema.pre('save', function(next) {
  const stockPercentage = (this.stock / this.maxStock) * 100;
  if (this.stock === 0) this.status = 'out';
  else if(stockPercentage <= 20) this.status = 'low';
  else this.status = 'active';
  next();
});

// Status update on findOneAndUpdate
productSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  const stock = update.stock ?? this._update.stock;
  const maxStock = update.maxStock ?? this._update.maxStock;
  if (stock === 0) this.set({ status: 'out' });
  else if ((stock / maxStock) * 100 <= 20) this.set({ status: 'low' });
  else this.set({ status: 'active' });
  next();
});

module.exports = mongoose.model('Product', productSchema);
