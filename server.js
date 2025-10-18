// backend/server.js - PRODUCTION VERSION
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Validate environment variables
if (!process.env.SQUARE_ACCESS_TOKEN) {
  console.error('❌ ERROR: SQUARE_ACCESS_TOKEN is required');
  console.error('💡 Update environment variables in Render with:');
  console.error('   SQUARE_ACCESS_TOKEN=your_PRODUCTION_access_token_here');
  process.exit(1);
}

console.log('✅ Backend server starting...');
console.log('🔑 Square Access Token:', process.env.SQUARE_ACCESS_TOKEN ? 'Loaded' : 'Missing');
console.log('🌍 Environment: PRODUCTION');

// Payment processing endpoint - PRODUCTION
app.post('/api/process-payment', async (req, res) => {
  try {
    const { sourceId, amount, bookingData, idempotencyKey } = req.body;

    console.log('💰 Processing payment:', {
      customer: `${bookingData.firstName} ${bookingData.lastName}`,
      amount: `$${(amount / 100).toFixed(2)}`,
      service: bookingData.serviceType
    });

    // Validate required fields
    if (!sourceId) {
      return res.status(400).json({
        success: false,
        error: 'Payment source ID is required'
      });
    }

    // PRODUCTION API call to Square
    const squareResponse = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-10-18',
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_id: sourceId,
        amount_money: {
          amount: parseInt(amount),
          currency: 'USD',
        },
        idempotency_key: idempotencyKey,
        note: `Limo booking - ${bookingData.serviceType} for ${bookingData.firstName} ${bookingData.lastName}`,
        reference_id: `booking_${Date.now()}`,
      }),
    });

    console.log('📡 Square API response status:', squareResponse.status);

    if (!squareResponse.ok) {
      const errorData = await squareResponse.json();
      console.error('❌ Square API error:', errorData);
      
      let errorMessage = 'Payment failed';
      if (errorData.errors && errorData.errors[0]) {
        errorMessage = errorData.errors[0].detail || errorData.errors[0].code;
      }
      
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }

    const result = await squareResponse.json();
    const payment = result.payment;

    console.log('✅ Payment successful:', {
      paymentId: payment.id,
      status: payment.status,
      amount: `$${(payment.amount_money.amount / 100).toFixed(2)}`
    });

    res.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount_money.amount,
      receiptUrl: payment.receipt_url,
    });

  } catch (error) {
    console.error('❌ Payment processing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment processing failed',
    });
  }
});

// Booking creation endpoint
app.post('/api/bookings/create', async (req, res) => {
  try {
    const { formData, paymentId, paymentStatus } = req.body;

    console.log('📝 Creating booking for:', formData.firstName, formData.lastName);

    // Validate required fields
    if (!formData?.firstName || !formData?.email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required booking information'
      });
    }

    const bookingId = `booking_${Date.now()}`;
    
    console.log('✅ Booking created:', {
      bookingId,
      customer: `${formData.firstName} ${formData.lastName}`,
      service: formData.serviceType,
      paymentStatus: paymentStatus || 'cash'
    });

    res.json({
      success: true,
      bookingId,
      message: 'Booking confirmed successfully!'
    });

  } catch (error) {
    console.error('❌ Booking error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString(),
    square: {
      configured: !!process.env.SQUARE_ACCESS_TOKEN,
      environment: 'Production'  // ← CHANGED TO PRODUCTION
    }
  });
});

// Test endpoint to verify Square connection - PRODUCTION
app.get('/api/test-square', async (req, res) => {
  try {
    const response = await fetch('https://connect.squareup.com/v2/locations', {
      headers: {
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Square-Version': '2024-10-18',
      },
    });

    if (response.ok) {
      const data = await response.json();
      res.json({ 
        success: true, 
        message: 'Square PRODUCTION API connection successful',
        locations: data.locations 
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to connect to Square PRODUCTION API'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`🌍 ENVIRONMENT: PRODUCTION`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/test-square`);
  console.log(`   POST http://localhost:${PORT}/api/process-payment`);
  console.log(`   POST http://localhost:${PORT}/api/bookings/create`);
});
