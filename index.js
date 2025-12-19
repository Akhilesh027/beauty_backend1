const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Product = require('./models/Product.js');
const Cart = require("./models/Cart.js");
const Service = require('./models/Service');
const User = require('./models/User.js');
const Order = require('./models/order.js');
const Staf = require('./models/Staff.js');
const Staff = require('./models/Staff.js');
const Package = require('./models/Package.js');
const Referral = require('./models/Referral.js');
const Banner = require('./models/Banner.js');
const Course = require('./models/Course.js');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const order = require('./models/order.js');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

cloudinary.config({
 cloud_name: "dguxtvyut",
  api_key: "952138336163551",
  api_secret: "ppFNE2zTSuTPotEZcemJ_on7iHg",
});

// Set up Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'Images', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
  },
});

const parser = multer({ storage });


// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://akhileshreddy811_db_user:VHRFkBeOLRl3FjpH@cluster0.f0nzozu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.log(err));

// Routes
// Example referral code generator (use your own if needed)
async function generateUniqueReferralCode(baseName = 'USR') {
  const prefix = ('' + baseName).replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'USR';
  let code;
  let exists = true;
  // try until unique (rare collision)
  do {
    code = prefix + Math.random().toString(36).substring(2, 7).toUpperCase();
    exists = await User.exists({ referralCode: code });
  } while (exists);
  return code;
}
function generateReferralCode(name) {
  return (name.substring(0, 3) + Math.random().toString(36).substring(2, 6)).toUpperCase();
}

app.post("/api/register", async (req, res) => {
  try {
    let { firstName, lastName, email, password, age, gender, referralCode, phone } = req.body;

    if (!firstName || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "First name, email and password are required" 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid email format" 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: "Password must be at least 6 characters long" 
      });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) return res.status(400).json({ 
      success: false,
      message: "Email already exists" 
    });

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) return res.status(400).json({ 
        success: false,
        message: "Phone number already exists" 
      });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newReferralCode = generateReferralCode(firstName);

    const user = new User({
      firstName,
      lastName: lastName || "",
      email: email.toLowerCase(),
      password: hashedPassword,
      age: age || "",
      gender: gender || "",
      phone: phone || "",
      phoneVerified: phone ? true : false,
      referralCode: newReferralCode,
      referredBy: referralCode ? referralCode.toUpperCase() : null,
      wallet: 0,
    });

    await user.save();

    // Reward referrer
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (referrer) {
        referrer.wallet += 100;
        await referrer.save();
      }
    }

    const token = jwt.sign({ id: user._id }, 'BANNU9', { expiresIn: "7d" });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        wallet: user.wallet,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        age: user.age,
        gender: user.gender,
      },
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error during registration" 
    });
  }
});
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ 
        success: false,
        message: "All fields are required" 
      });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ 
      success: false,
      message: "Invalid credentials" 
    });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ 
      success: false,
      message: "Invalid credentials" 
    });

    const token = jwt.sign({ id: user._id }, 'BANNU9', { expiresIn: "7d" });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        wallet: user.wallet,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

app.get('/api/bookings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate userId
    if (!userId || userId.trim() === '') {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const bookings = await Order.find({ userId }).sort({ orderDate: -1 });
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this user' });
    }
    
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/api/referral/code/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const referral = await Referral.findOne({ userId });
    if (!referral) {
      return res.status(404).json({ message: 'Referral entry not found' });
    }

    res.json({ referralCode: referral.referralCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
app.get('/api/referral/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const referral = await Referral.findOne({ userId });
    if (!referral) {
      return res.status(404).json({ message: 'Referral entry not found' });
    }

    // Ensure default values if not present
    const stats = {
      totalReferrals: referral.totalReferrals || 0,
      successfulReferrals: referral.successfulReferrals || 0,
      pendingReferrals: referral.pendingReferrals || 0,
      earnedCredits: referral.earnedCredits || 0,
      walletBalance: referral.walletBalance || 0 // if wallet is tracked here
    };

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
app.get('/api/referral/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const referral = await Referral.findOne({ userId });
    if (!referral) {
      return res.status(404).json({ message: 'Referral entry not found' });
    }

    // Ensure history is an array
    const history = Array.isArray(referral.history) ? referral.history : [];

    res.json({ history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/referral-status/:userId', async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const authenticatedUserId = req.params.userId;


    // Optionally verify the requestedUserId matches authenticatedUserId
    if (requestedUserId !== authenticatedUserId) {
      return res.status(403).json({ message: 'Forbidden: Access denied' });
    }


    // Fetch user from database
    const user = await User.findById(authenticatedUserId).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });


    // Find users who were referred by this user's referralCode
    const referredUsers = await User.find({ referredBy: user.referralCode })
      .select('firstName lastName email coins referralCode')
      .lean();


    const referredList = referredUsers.map(u => ({
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      email: u.email,
      earnedCoins: 125 // Or use actual logic if stored per referral
    }));


    res.json({
      referralCode: user.referralCode,
      coins: user.coins,
      referralCount: user.referralCount,
      referredUsers: referredList
    });


  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
// GET all services
app.get('/api/services', async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.get('/api/bookings', async (req, res) => {
  try {
    const services = await Order.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.get('/api/bookings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate userId
    if (!userId || userId.trim() === '') {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const bookings = await Order.find({ userId }).sort({ orderDate: -1 });
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this user' });
    }
    
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/Users', async (req, res) => {
  try {
    const services = await User.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// GET a specific service
app.get('/api/services/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new service
app.post('/api/services', parser.single('image'), async (req, res) => {
  try {
    const { name, category, price, duration, status, description } = req.body;
    
    const service = new Service({
      name,
      category,
      price,
      duration,
      status,
      description,
      image: req.file ? req.file.filename : ''
    });

    const newService = await service.save();
    res.status(201).json(newService);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT (update) a service
app.put('/api/services/:id', parser.single('image'), async (req, res) => {
  try {
    const { name, category, price, duration, status, description } = req.body;
    
    const updateData = {
      name,
      category,
      price,
      duration,
      status,
      description
    };

    // If a new image was uploaded, add it to the update data
    if (req.file) {
      updateData.image = req.file.filename;
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json(updatedService);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a service
app.delete('/api/services/:id', async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Search services
app.get('/api/services/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const services = await Service.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    });
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Get all products with optional filtering
app.get('/api/products', async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let filter = {};
    
    // Apply filters if provided
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get product statistics
app.get('/api/products/stats', async (req, res) => {
  try {
    const stats = await Product.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
const productValidationRules = {
  create: [
    body('name').notEmpty().withMessage('Product name is required'),
    body('type').isIn(['salon_for_women', 'spa_for_women', 'hydra_facial', 'pre_bridal']).withMessage('Invalid product type'),
    body('category').notEmpty().withMessage('Category is required'),
    body('serviceType').isIn(['home_service', 'clinic_service', 'both']).withMessage('Invalid service type'),
    body('gender').isIn(['men', 'women', 'unisex']).withMessage('Invalid gender'),
    body('sku').notEmpty().withMessage('SKU is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('maxStock').isInt({ min: 0 }).withMessage('Max stock must be a non-negative integer')
  ],
  update: [
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('maxStock').optional().isInt({ min: 0 }).withMessage('Max stock must be a non-negative integer'),
    body('discount').optional().isInt({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100')
  ]
};

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// ======================
// ERROR HANDLING MIDDLEWARE
// ======================
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
};
app.post('/api/products', productValidationRules.create, handleValidationErrors, async (req, res) => {
  try {
    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku: req.body.sku });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }


    const productData = {
      ...req.body,
      // Fix: Only filter if arrays exist, don't aggressively remove all items
      overview: Array.isArray(req.body.overview) ? req.body.overview.filter(item => item && typeof item === 'string' && item.trim() !== '') : [],
      thingsToKnow: Array.isArray(req.body.thingsToKnow) ? req.body.thingsToKnow.filter(item => item && typeof item === 'string' && item.trim() !== '') : [],
      precautions: Array.isArray(req.body.precautions) ? req.body.precautions.filter(item => item && typeof item === 'string' && item.trim() !== '') : [],
      faqs: Array.isArray(req.body.faqs) ? req.body.faqs.filter(faq => 
        faq && 
        typeof faq === 'object' && 
        faq.question && typeof faq.question === 'string' && faq.question.trim() !== '' &&
        faq.answer && typeof faq.answer === 'string' && faq.answer.trim() !== ''
      ) : [],
      procedure: Array.isArray(req.body.procedure) ? req.body.procedure.filter(step => 
        step && 
        typeof step === 'object' && 
        (
          (step.title && typeof step.title === 'string' && step.title.trim() !== '') ||
          (step.desc && typeof step.desc === 'string' && step.desc.trim() !== '')
        )
      ) : []
    };


    console.log('Processed product data:', {
      overview: productData.overview,
      thingsToKnow: productData.thingsToKnow,
      precautions: productData.precautions,
      faqs: productData.faqs,
      procedure: productData.procedure
    });


    const product = new Product(productData);
    await product.save();


    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
});

app.put('/api/products/:id', productValidationRules.update, handleValidationErrors, async (req, res) => {
  try {
    // Check if SKU is being updated and if it already exists
    if (req.body.sku) {
      const existingProduct = await Product.findOne({ 
        sku: req.body.sku, 
        _id: { $ne: req.params.id } 
      });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Product with this SKU already exists'
        });
      }
    }

    const updateData = {
      ...req.body,
      // Ensure arrays are properly formatted
      overview: Array.isArray(req.body.overview) ? req.body.overview.filter(item => item && item.trim() !== '') : undefined,
      thingsToKnow: Array.isArray(req.body.thingsToKnow) ? req.body.thingsToKnow.filter(item => item && item.trim() !== '') : undefined,
      precautions: Array.isArray(req.body.precautions) ? req.body.precautions.filter(item => item && item.trim() !== '') : undefined,
      faqs: Array.isArray(req.body.faqs) ? req.body.faqs.filter(faq => faq.question && faq.answer && faq.question.trim() !== '' && faq.answer.trim() !== '') : undefined,
      procedure: Array.isArray(req.body.procedure) ? req.body.procedure.filter(step => (step.title && step.title.trim() !== '') || (step.desc && step.desc.trim() !== '')) : undefined
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
});
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
      data: product
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
});
app.get('/api/products/stats/overview', async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const lowStockCount = await Product.countDocuments({ status: 'low' });
    const outOfStockCount = await Product.countDocuments({ status: 'out' });
    const categories = await Product.distinct('category');

    res.json({
      success: true,
      data: {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        categoriesCount: categories.length
      }
    });
  } catch (error) {
    console.error('Error fetching product stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product statistics',
      error: error.message
    });
  }
});

// POST /api/upload - Upload image
app.post('/api/upload', parser.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Cloudinary file URL is in req.file.path
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: req.file.path,
      filename: req.file.filename, // This usually contains Cloudinary public_id
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading image',
      error: error.message,
    });
  }
});


// DELETE /api/upload/:filename - Delete uploaded image
app.delete('/api/upload/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  }
});

// Delete a product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Service Management API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
  }
  
  res.status(500).json({ message: err.message });
});

// Get user cart
// Assuming Express app is already set up and Cart is your Mongoose model

// Get cart by userId
app.get("/api/cart/:userId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId });
    res.json(cart || { userId: req.params.userId, items: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add product to cart or increase quantity
app.post("/api/cart/add", async (req, res) => {
  const { userId, product } = req.body;

  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (!product) return res.status(400).json({ error: "product is required" });

  try {
    let cart = await Cart.findOne({ userId });

if (!cart) {
  cart = new Cart({ userId, products: [{ ...product, quantity: 1 }] });
} else {
  if (!cart.products) cart.products = [];

  const existingItem = cart.products.find(
    (item) => item.productId.toString() === product.productId.toString()
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.products.push({ ...product, quantity: 1 });
  }
}

await cart.save();
res.json(cart);

  } catch (err) {
    console.error("Cart add error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update quantity of a product in cart
// Update product quantity in cart
app.put("/api/cart/update/:userId/:productId/:quantity", async (req, res) => {
  const { userId, productId, quantity } = req.params;

  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (!productId) return res.status(400).json({ error: "productId is required" });
  if (!quantity || Number(quantity) < 1)
    return res.status(400).json({ error: "quantity must be at least 1" });

  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const item = cart.items.find(
      (item) => item.productId.toString() === productId.toString()
    );
    if (!item) return res.status(404).json({ error: "Product not found in cart" });

    item.quantity = Number(quantity);
    await cart.save();
    res.json(cart);
  } catch (err) {
    console.error("Cart update error:", err);
    res.status(500).json({ error: err.message });
  }
});
// Remove from cart (DELETE /api/cart/remove/:userId/:productId)
app.delete("/api/cart/remove/:userId/:productId", async (req, res) => {
  const { userId, productId } = req.params;
  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    if (!cart.products) cart.products = [];

    // Find product index
    const index = cart.products.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (index === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // Remove product
    cart.products.splice(index, 1);
    await cart.save();

    // ✅ Always return `products`
    res.json({ products: cart.products });
  } catch (err) {
    console.error("Remove Cart Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// Clear cart (DELETE /api/cart/clear/:userId)
app.delete("/api/cart/clear/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const cart = await Cart.findOneAndUpdate(
      { userId },
      { products: [] },
      { new: true }
    );

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // ✅ Always return `products`
    res.json({ products: cart.products });
  } catch (err) {
    console.error("Clear Cart Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/orders/create", async (req, res) => {
  let orderData = req.body;

  try {
    // 1. Handle address based on service type
    if (orderData.booking && orderData.booking.serviceType === 'clinic') {
      // For clinic service, we still need basic contact info but not full address
      // Ensure we have at least name and phone
      if (!orderData.address || !orderData.address.fullName || !orderData.address.phone) {
        return res.status(400).json({
          error: "For clinic service, full name and phone number are required",
          details: {
            fullName: !orderData.address?.fullName ? "Full name is required" : undefined,
            phone: !orderData.address?.phone ? "Phone number is required" : undefined
          }
        });
      }

      // Clean up address for clinic service - keep only essential fields
      orderData.address = {
        fullName: orderData.address.fullName,
        phone: orderData.address.phone,
        // Set other fields to empty or clinic-specific values
        street: "Clinic Location - To be visited",
        city: "Clinic City",
        state: "Clinic State", 
        zipCode: "000000"
      };
    } else if (orderData.booking && orderData.booking.serviceType === 'home') {
      // For home service, validate all address fields
      const requiredFields = ['fullName', 'street', 'city', 'state', 'zipCode', 'phone'];
      const missingFields = requiredFields.filter(field => !orderData.address?.[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: "For home service, all address fields are required",
          details: missingFields.reduce((acc, field) => {
            acc[field] = `${field} is required`;
            return acc;
          }, {})
        });
      }

      // Validate phone format for home service
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(orderData.address.phone)) {
        return res.status(400).json({
          error: "Invalid phone number",
          details: {
            phone: "Please enter a valid 10-digit Indian phone number"
          }
        });
      }
    } else {
      return res.status(400).json({
        error: "Service type is required",
        details: {
          serviceType: "Please select either 'home' or 'clinic' service"
        }
      });
    }

    // 2. Validate booking details
    if (!orderData.booking || !orderData.booking.date || !orderData.booking.timeSlot) {
      return res.status(400).json({
        error: "Booking details are incomplete",
        details: {
          date: !orderData.booking?.date ? "Booking date is required" : undefined,
          timeSlot: !orderData.booking?.timeSlot ? "Time slot is required" : undefined
        }
      });
    }

    // 3. Validate products
    if (!orderData.products || !Array.isArray(orderData.products) || orderData.products.length === 0) {
      return res.status(400).json({
        error: "Order must contain at least one product"
      });
    }

    // 4. Validate amounts
    if (!orderData.amounts || typeof orderData.amounts.subtotal !== 'number' || typeof orderData.amounts.total !== 'number') {
      return res.status(400).json({
        error: "Order amounts are invalid",
        details: {
          subtotal: "Subtotal is required and must be a number",
          total: "Total amount is required and must be a number"
        }
      });
    }

    // 5. Generate order ID if not provided
    if (!orderData.orderId) {
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      orderData.orderId = `ORD-${timestamp}-${random}`;
    }

    // 6. Set order date if not provided
    if (!orderData.orderDate) {
      orderData.orderDate = new Date();
    }

    // 7. Create and save the order
    const newOrder = new Order(orderData);
    await newOrder.save();

    // 8. Optionally: Send notification or trigger other actions
    // For example: send email confirmation, notify staff, etc.

    // 9. Respond with success
    res.status(201).json({ 
      message: "Order placed successfully", 
      order: newOrder,
      serviceType: newOrder.booking.serviceType,
      nextSteps: newOrder.booking.serviceType === 'clinic' 
        ? "Please visit our clinic at the scheduled time" 
        : "Our staff will visit your location at the scheduled time"
    });

  } catch (err) {
    console.error("Order creation error:", err);
    console.error("Payload received:", req.body);

    // Handle different types of errors
    if (err.name === 'ValidationError') {
      const errorDetails = {};
      Object.keys(err.errors).forEach(key => {
        errorDetails[key] = err.errors[key].message;
      });
      
      return res.status(400).json({ 
        error: "Validation failed",
        details: errorDetails
      });
    } else if (err.code === 11000) {
      return res.status(400).json({
        error: "Order ID already exists",
        details: "Please try again or contact support"
      });
    }

    // Generic server error
    res.status(500).json({ 
      error: "Internal server error",
      message: "Could not create order. Please try again."
    });
  }
});


app.post('/api/auth/send-otp', async (req, res) => {
    const { emailOrMobile } = req.body;
  if (!emailOrMobile) return res.status(400).json({ message: 'Email or mobile required' });

  const otp = '1234'; // Dummy OTP for testing

  let user = await User.findOne({ emailOrMobile });
  if (!user) user = new User({ emailOrMobile });
  user.otp = otp;
  await user.save();
  console.log(`Dummy OTP for ${emailOrMobile}: ${otp}`); // Always 1234
  res.json({ message: 'OTP sent', userId: user._id });

});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.otp === otp) {
    user.otp = null; // clear OTP after verification
    await user.save();
    return res.json({ message: 'OTP verified', userId: user._id });
  } else {
    return res.status(400).json({ message: 'Invalid OTP' });
  }
});




app.post('/api/staff/register', async (req, res) => {
 try {
    const { name, phone, email, role, password } = req.body;

    // Validation
    if (!name || !phone || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (phone.length !== 10) {
      return res.status(400).json({ error: 'Phone number must be 10 digits' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Check if staff already exists
    const existingStaff = await Staff.findOne({ 
      $or: [{ phone }, { email }] 
    });
    
    if (existingStaff) {
      if (existingStaff.phone === phone) {
        return res.status(409).json({ error: 'User with this phone number already exists' });
      }
      if (existingStaff.email === email) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new staff
    const staff = new Staff({ 
      name, 
      phone, 
      email, 
      role: role || 'vendor', 
      password: hashedPassword 
    });
    
    await staff.save();

    // Generate JWT token
    const token = jwt.sign(
      { staffId: staff._id, role: staff.role }, 
      process.env.JWT_SECRET || 'BANNU9', 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      staff: {
        id: staff._id,
        name: staff.name,
        phone: staff.phone,
        email: staff.email,
        role: staff.role,
      },
      authToken: token,
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login route
app.post('/api/staff/login', async (req, res) => {
    try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Find staff by email
    const staff = await Staff.findOne({ email });
    if (!staff) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, staff.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { staffId: staff._id, role: staff.role }, 
      process.env.JWT_SECRET || 'BANNU9', 
      { expiresIn: '7d' }
    );

    res.json({
      staff: {
        id: staff._id,
        name: staff.name,
        phone: staff.phone,
        email: staff.email,
        role: staff.role,
      },
      authToken: token,
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Fetch single staff
app.get('/api/staff/:id', async (req, res) => {
  const staff = await Staff.findById(req.params.id);
  res.json(staff);
});

// Fetch all staff
app.get('/api/staff', async (req, res) => {
  const staffList = await Staff.find();
  res.json(staffList);
});

// PATCH /api/bookings/:id/assign - Assign staff to a booking
app.patch('/api/bookings/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    // Validate input
    if (!staffId) {
      return res.status(400).json({ message: 'Staff ID is required' });
    }

    // Check if booking exists
    const booking = await Order.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Update booking with assigned staff
    booking.assignedStaff = {
      _id: staff._id,
      name: staff.name,
      email: staff.email,
      phone: staff.phone
    };

    // Update status to assigned if it was unassigned
    if (booking.status === 'unassigned' || !booking.status) {
      booking.status = 'assigned';
    }

    const updatedBooking = await booking.save();

    res.json({
      message: 'Staff assigned successfully',
      assignedStaff: updatedBooking.assignedStaff,
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Error assigning staff:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/bookings - Get all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Order.find().sort({ orderDate: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/bookings/assigned/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    // Find bookings where assignedStaff._id matches userId
    const bookings = await Order.find({ 'assignedStaff._id': userId });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching bookings' });
  }
});
// Get dashboard stats for a staff user
app.get('/api/dashboard/stats/:staffId', async (req, res) => {
  try {
    const staffId = req.params.staffId;
    
    // Example: count bookings by status for this staff user
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAppointments = await order.countDocuments({
      'assignedStaff._id': staffId,
      orderDate: { $gte: today }
    });
    
    const completed = await order.countDocuments({
      'assignedStaff._id': staffId,
      status: 'completed'
    });
    
    const pending = await order.countDocuments({
      'assignedStaff._id': staffId,
      status: 'pending'
    });

    // Example earnings aggregation, assuming `amounts.total`
    const earningsAgg = await order.aggregate([
      { $match: { 'assignedStaff._id': staffId, status: 'completed' } },
      { $group: { _id: null, totalEarnings: { $sum: '$amounts.total' } } }
    ]);
    const totalEarnings = earningsAgg.length ? earningsAgg[0].totalEarnings : 0;

    // Example rating, placeholder
    const rating = 4.5;

    res.json({ todayAppointments, completed, pending, totalEarnings, rating });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
});

// Get bookings assigned to staff user filtered by optional status
app.get('/api/bookings/assigned/:staffId', async (req, res) => {
  try {
    const staffId = req.params.staffId;
    const status = req.query.status; // e.g., 'pending', 'upcoming', 'completed'

    const filter = { 'assignedStaff._id': staffId };
    if (status) {
      filter.status = status;
    }

    const bookings = await Order.find(filter).sort({ orderDate: 1 });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching bookings' });
  }
});

// Accept a pending booking
app.post('/api/bookings/:bookingId/accept', async (req, res) => {
  try {
    const bookingId = req.params.bookingId;

    // Update booking status to accepted
    const booking = await Order.findByIdAndUpdate(bookingId, { status: 'confirmed' }, { new: true });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ message: 'Booking accepted', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error accepting booking' });
  }
});

// Reject a pending booking
app.post('/bookings/:bookingId/reject', async (req, res) => {
  try {
    const bookingId = req.params.bookingId;

    // Update booking status to rejected or canceled
    const booking = await order.findByIdAndUpdate(bookingId, { status: 'rejected' }, { new: true });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ message: 'Booking rejected', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error rejecting booking' });
  }
});
// Complete a booking
app.post('/api/bookings/:bookingId/complete', async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await Order.findByIdAndUpdate(
      bookingId,
      { status: 'completed' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Booking marked as completed', booking });
  } catch (error) {
    res.status(500).json({ error: 'Server error completing booking' });
  }
});

// Mark booking as not completed
app.post('/api/bookings/:bookingId/not_completed', async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await Order.findByIdAndUpdate(
      bookingId,
      { status: 'not_completed' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Booking marked as not completed', booking });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating booking' });
  }
});
// Get all packages
app.get('/api/packages', async (req, res) => {
  try {
    const packages = await Package.find().populate('services.productId', 'name');
    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch packages.' });
  }
});

// Get all products (services) - from your products API or here for convenience
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({}, 'name');  // select only name field
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// Create a new package
app.post('/api/packages', async (req, res) => {
  try {
    const { name, services, amount } = req.body;

    // Ensure services is an array of product IDs
    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one service.' });
    }

    // Fetch service details from products to embed service names (optional)
    const serviceDocs = await Product.find({ _id: { $in: services } }, 'name');

    const servicesWithName = serviceDocs.map((s) => ({
      productId: s._id,
      name: s.name,
    }));

    const newPackage = new Package({
      name,
      services: servicesWithName,
      amount,
    });

    await newPackage.save();

    res.json({ message: 'Package created successfully.', package: newPackage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create package.' });
  }
});

// Update package
app.put('/api/packages/:id', async (req, res) => {
  try {
    const { name, services, amount } = req.body;
    const id = req.params.id;

    const serviceDocs = await Product.find({ _id: { $in: services } }, 'name');
    const servicesWithName = serviceDocs.map((s) => ({
      productId: s._id,
      name: s.name,
    }));

    const updatedPackage = await Package.findByIdAndUpdate(
      id,
      { name, services: servicesWithName, amount },
      { new: true }
    );

    if (!updatedPackage) return res.status(404).json({ error: 'Package not found' });

    res.json({ message: 'Package updated.', package: updatedPackage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update package.' });
  }
});
app.get('/api/packages/:packageId', async (req, res) => {
  const { packageId } = req.params;
  if (!packageId) return res.status(400).json({ error: 'packageId is required' });

  try {
    const pkg = await Package.findById(packageId).populate('services'); // example Mongoose call
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    res.json(pkg);
  } catch (err) {
    console.error('Get package error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get("/api/products/:ids", async (req, res) => {
  const ids = req.params.ids.split(",");
  try {
    const products = await Product.find({ _id: { $in: ids } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Delete package
app.delete('/api/packages/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Package.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ error: 'Package not found' });

    res.json({ message: 'Package deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete package.' });
  }
});
// Create banner - POST
app.post('/api/banners', parser.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }
    const { name, navigateTo, section } = req.body;
    if (!name || !navigateTo) {
      return res.status(400).json({ message: 'Name and navigateTo are required' });
    }

    const banner = new Banner({
      name,
      navigateTo,
      section: section || 'default',
      imageUrl: req.file.path,
    });

    await banner.save();
    res.status(201).json(banner);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update banner - PUT
app.put('/api/banners/:id', parser.single('image'), async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });

    banner.name = req.body.name || banner.name;
    banner.navigateTo = req.body.navigateTo || banner.navigateTo;
    banner.section = req.body.section || banner.section;

    if (req.file) {
      // Delete old image from Cloudinary
      if (banner.imageUrl) {
        const parts = banner.imageUrl.split('/');
        const publicIdWithExt = parts.slice(-1)[0];
        const publicId = publicIdWithExt.split('.')[0];
        await cloudinary.uploader.destroy(`banners/${publicId}`);
      }
      banner.imageUrl = req.file.path;
    }

    await banner.save();
    res.json(banner);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete banner - DELETE
app.delete('/api/banners/:id', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });

    // Delete image from Cloudinary
    if (banner.imageUrl) {
      const parts = banner.imageUrl.split('/');
      const publicIdWithExt = parts.slice(-1)[0];
      const publicId = publicIdWithExt.split('.')[0];
      await cloudinary.uploader.destroy(`banners/${publicId}`);
    }

    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Banner deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get banners - GET
app.get('/api/banners', async (req, res) => {
  try {
    const banners = await Banner.find();
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/courses', async (req, res) => {
  try {
    const { category, level, minPrice, maxPrice, search } = req.query;
    
    let filter = { isActive: true };
    
    // Category filter
    if (category && category !== 'All') {
      filter.category = category;
    }
    
    // Level filter
    if (level) {
      filter.level = level;
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const courses = await Course.find(filter)
      .sort({ rating: -1, createdAt: -1 })
      .lean();
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching courses', 
      error: error.message 
    });
  }
});

// @route   GET /api/courses/:id
// @desc    Get single course by ID
// @access  Public
app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }
    
    res.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching course', 
      error: error.message 
    });
  }
});

// @route   POST /api/courses
// @desc    Create a new course
// @access  Public (should be Private/Admin in production)
app.post('/api/courses', async (req, res) => {
  try {
    const courseData = req.body;
    
    // Validate required fields
    if (!courseData.name || !courseData.description || !courseData.category || !courseData.price || !courseData.duration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, description, category, price, duration'
      });
    }
    
    const course = new Course(courseData);
    const savedCourse = await course.save();
    
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: savedCourse
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(400).json({ 
      success: false,
      message: 'Error creating course', 
      error: error.message 
    });
  }
});

// @route   PUT /api/courses/:id
// @desc    Update a course
// @access  Public (should be Private/Admin in production)
app.put('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(400).json({ 
      success: false,
      message: 'Error updating course', 
      error: error.message 
    });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete a course (soft delete - set isActive to false)
// @access  Public (should be Private/Admin in production)
app.delete('/api/courses/:id', async (req, res) => {
  try {
    // Soft delete - just set isActive to false
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    // For hard delete, use this instead:
    // const course = await Course.findByIdAndDelete(req.params.id);
    
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Course deleted successfully',
      data: course
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting course', 
      error: error.message 
    });
  }
});

// @route   GET /api/courses/category/:category
// @desc    Get courses by category
// @access  Public
app.get('/api/courses/category/:category', async (req, res) => {
  try {
    const courses = await Course.find({ 
      category: req.params.category,
      isActive: true 
    })
    .sort({ rating: -1, createdAt: -1 })
    .lean();
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses by category:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching courses', 
      error: error.message 
    });
  }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll a student in a course
// @access  Public (should be Private in production)
app.post('/api/courses/:id/enroll', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }
    
    // Increment enrolled students count
    course.students += 1;
    course.enrolledStudents += 1;
    await course.save();
    
    res.json({ 
      success: true,
      message: 'Successfully enrolled in course',
      data: course 
    });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error enrolling in course', 
      error: error.message 
    });
  }
});

// @route   GET /api/courses/stats/overview
// @desc    Get course statistics
// @access  Public (should be Private/Admin in production)
app.get('/api/courses/stats/overview', async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments({ isActive: true });
    
    const totalStudents = await Course.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$students' } } }
    ]);
    
    const averageRating = await Course.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    
    const coursesByCategory = await Course.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $count: {} } } },
      { $sort: { count: -1 } }
    ]);
    
    const coursesByLevel = await Course.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$level', count: { $count: {} } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalCourses,
        totalStudents: totalStudents[0]?.total || 0,
        averageRating: averageRating[0]?.avgRating?.toFixed(2) || 0,
        coursesByCategory,
        coursesByLevel
      }
    });
  } catch (error) {
    console.error('Error fetching course stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching stats', 
      error: error.message 
    });
  }
});

// @route   PATCH /api/courses/:id/rating
// @desc    Update course rating
// @access  Public (should be Private in production)
app.patch('/api/courses/:id/rating', async (req, res) => {
  try {
    const { rating } = req.body;
    
    if (!rating || rating < 0 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rating. Must be between 0 and 5'
      });
    }
    
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { rating: parseFloat(rating) },
      { new: true }
    );
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Rating updated successfully',
      data: course
    });
  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating rating',
      error: error.message
    });
  }
});
// Add this to your app.js after the Course model

// Enrollment Schema
const enrollmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  userName: String,
  userEmail: String,
  courseName: String,
  coursePrice: Number,
  courseCategory: String,
  courseDuration: String,
  courseImage: String,
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  completedLessons: [{
    lessonId: String,
    completedAt: Date
  }],
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateUrl: String
}, {
  timestamps: true
});

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

// ==================== ENROLLMENT ROUTES ====================

// Create enrollment
app.post('/api/enrollments', async (req, res) => {
  try {
    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      userId: req.body.userId,
      courseId: req.body.courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    const enrollment = new Enrollment(req.body);
    await enrollment.save();

    res.status(201).json({
      success: true,
      message: 'Enrollment successful',
      data: enrollment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating enrollment',
      error: error.message
    });
  }
});

// Check enrollment status
app.get('/api/enrollments/check/:courseId/:userId', async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      courseId: req.params.courseId,
      userId: req.params.userId
    });

    res.json({
      success: true,
      isEnrolled: !!enrollment,
      enrollment: enrollment || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking enrollment',
      error: error.message
    });
  }
});

// Get user enrollments
app.get('/api/enrollments/user/:userId', async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.params.userId })
      .sort({ enrollmentDate: -1 })
      .populate('courseId');

    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching enrollments',
      error: error.message
    });
  }
});

// Update enrollment progress
app.patch('/api/enrollments/:id/progress', async (req, res) => {
  try {
    const { progress } = req.body;
    const enrollment = await Enrollment.findByIdAndUpdate(
      req.params.id,
      { progress },
      { new: true }
    );

    res.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating progress',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});