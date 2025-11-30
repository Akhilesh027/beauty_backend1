const mongoose = require("mongoose");

const assignedStaffSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: String,
  phone: String
});

// --- Booking Schema for Service Details ---
const bookingSchema = new mongoose.Schema({
  date: { 
    type: Date, 
    required: true 
  },
  timeSlot: { 
    type: String, 
    required: true 
  },
  serviceType: { 
    type: String, 
    enum: ['home', 'clinic'], 
    required: true 
  },
});

// --- Address Schema with conditional requirements ---
const addressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: function() {
      return this.parent().booking.serviceType === 'home' || this.parent().booking.serviceType === 'clinic';
    }
  },
  street: {
    type: String,
    required: function() {
      return this.parent().booking.serviceType === 'home';
    }
  },
  city: {
    type: String,
    required: function() {
      return this.parent().booking.serviceType === 'home';
    }
  },
  state: {
    type: String,
    required: function() {
      return this.parent().booking.serviceType === 'home';
    }
  },
  zipCode: {
    type: String,
    required: function() {
      return this.parent().booking.serviceType === 'home';
    }
  },
  phone: {
    type: String,
    required: function() {
      return this.parent().booking.serviceType === 'home' || this.parent().booking.serviceType === 'clinic';
    }
  },
  landmark: {
    type: String,
    required: false
  }
});

const OrderSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true 
  },

  products: [
    {
      productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product",

      },
      title: { 
        type: String, 
        required: true 
      },
      price: { 
        type: Number, 
        required: true 
      },
      quantity: { 
        type: Number, 
        default: 1,
        min: 1
      },
      image: {
        type: String,
        required: false
      }
    },
  ],
  
  // --- Integrated Booking Details ---
  booking: {
    type: bookingSchema,
    required: true 
  },

  // --- Updated Address with conditional requirements ---
  address: {
    type: addressSchema,
    required: function() {
      // Address is always required, but validation of inner fields is conditional
      return true;
    },
    validate: {
      validator: function(address) {
        const serviceType = this.booking.serviceType;
        
        if (serviceType === 'home') {
          // For home service, validate all address fields
          return address.fullName && 
                 address.street && 
                 address.city && 
                 address.state && 
                 address.zipCode && 
                 address.phone;
        } else if (serviceType === 'clinic') {
          // For clinic service, only validate name and phone
          return address.fullName && address.phone;
        }
        return false;
      },
      message: 'Address validation failed based on service type'
    }
  },
  
  paymentType: { 
    type: String, 
    enum: ['Cash on Delivery', 'Online Payment', 'Card', 'UPI'],
    default: "Cash on Delivery" 
  },
  
  amounts: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  assignedStaff: assignedStaffSchema,

  orderId: { 
    type: String, 
    unique: true, 
    required: true 
  },

  orderDate: { 
    type: Date, 
    default: Date.now 
  },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },

  // --- Additional fields for better tracking ---
  estimatedCompletionTime: {
    type: Date,
    required: false
  },

  customerNotes: {
    type: String,
    required: false,
    maxlength: 500
  },

  staffNotes: {
    type: String,
    required: false,
    maxlength: 500
  },

  cancellationReason: {
    type: String,
    required: false
  },

  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: false
  },

  feedback: {
    type: String,
    required: false,
    maxlength: 1000
  }

}, { 
  timestamps: true 
});

// --- Pre-save middleware to generate order ID ---
OrderSchema.pre('save', function(next) {
  if (!this.orderId) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderId = `ORD-${timestamp}-${random}`;
  }
  next();
});

// --- Virtual for formatted address ---
OrderSchema.virtual('formattedAddress').get(function() {
  if (this.booking.serviceType === 'clinic') {
    return `Clinic Service - ${this.address.fullName} (${this.address.phone})`;
  }
  
  return `${this.address.street}, ${this.address.city}, ${this.address.state} - ${this.address.zipCode}`;
});

// --- Index for better query performance ---
OrderSchema.index({ userId: 1, orderDate: -1 });
OrderSchema.index({ 'booking.date': 1, 'booking.timeSlot': 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ 'assignedStaff._id': 1 });

module.exports = mongoose.model("Order", OrderSchema);