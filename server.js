// backend/server.js - Using direct Square REST API
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Validate environment variables


// Payment processing endpoint - Direct Square API call
app.post('/api/process-payment', async (req, res) => {
  try {
    const { sourceId, amount, bookingData, idempotencyKey } = req.body;

    console.log('💰 Processing payment:', {
      customer: `${bookingData?.firstName} ${bookingData?.lastName}`,
      amount: `$${(amount / 100).toFixed(2)}`,
      service: bookingData?.serviceType,
      token: sourceId ? `${sourceId.substring(0, 20)}...` : 'missing'
    });

    // Debug: Log environment info
    console.log('🔧 Payment Environment:', {
      nodeEnv: process.env.NODE_ENV,
      hasAccessToken: !!process.env.SQUARE_ACCESS_TOKEN,
      tokenPrefix: process.env.SQUARE_ACCESS_TOKEN ? 
        process.env.SQUARE_ACCESS_TOKEN.substring(0, 10) + '...' : 'missing',
      expectedEnvironment: process.env.SQUARE_ACCESS_TOKEN?.startsWith('EAAA') ? 'Production' : 
                          process.env.SQUARE_ACCESS_TOKEN?.startsWith('sandbox') ? 'Sandbox' : 'Unknown'
    });

    // Validate required fields
    if (!sourceId) {
      return res.status(400).json({
        success: false,
        error: 'Payment source ID is required'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid payment amount is required'
      });
    }

    // Determine API endpoint based on access token
    const isSandboxToken = process.env.SQUARE_ACCESS_TOKEN?.startsWith('sandbox') || 
                          process.env.SQUARE_ACCESS_TOKEN?.startsWith('EAAAA');
    
    const squareApiUrl = isSandboxToken 
      ? 'https://connect.squareupsandbox.com/v2/payments'
      : 'https://connect.squareup.com/v2/payments';

    console.log('📡 Calling Square API:', {
      url: squareApiUrl,
      environment: isSandboxToken ? 'SANDBOX' : 'PRODUCTION'
    });

    // Prepare payment request
    const paymentRequest = {
      source_id: sourceId,
      amount_money: {
        amount: parseInt(amount), // Convert to number
        currency: 'USD',
      },
      idempotency_key: idempotencyKey || `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      autocomplete: true,
      note: `Limo booking - ${bookingData?.serviceType || 'service'} for ${bookingData?.firstName || 'customer'}`,
      reference_id: `booking_${Date.now()}`,
      location_id: process.env.SQUARE_LOCATION_ID // Add this if you have it
    };

    console.log('💳 Payment request:', {
      ...paymentRequest,
      source_id: `${paymentRequest.source_id.substring(0, 20)}...`
    });

    // Make API call to Square
    const squareResponse = await fetch(squareApiUrl, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-10-18',
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentRequest),
    });

    console.log('📡 Square API response status:', squareResponse.status);

    const responseText = await squareResponse.text();
    let result;
    
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse Square response:', responseText);
      return res.status(500).json({
        success: false,
        error: 'Invalid response from payment processor',
        rawResponse: responseText.substring(0, 200)
      });
    }

    if (!squareResponse.ok) {
      console.error('❌ Square API error:', {
        status: squareResponse.status,
        statusText: squareResponse.statusText,
        errors: result.errors
      });
      
      let errorMessage = 'Payment failed';
      if (result.errors && result.errors[0]) {
        const error = result.errors[0];
        errorMessage = error.detail || error.code || 'Payment processing failed';
        
        // Provide user-friendly messages
        if (error.code === 'UNAUTHORIZED') {
          errorMessage = 'Payment system configuration error. Please contact support.';
        } else if (error.code === 'CARD_DECLINED') {
          errorMessage = 'Card was declined. Please use a different payment method.';
        } else if (error.code === 'INVALID_REQUEST') {
          errorMessage = 'Invalid payment request. Please try again.';
        }
      }
      
      return res.status(400).json({
        success: false,
        error: errorMessage,
        details: result.errors
      });
    }

    const payment = result.payment;

    console.log('✅ Payment successful:', {
      paymentId: payment.id,
      status: payment.status,
      amount: `$${(payment.amount_money.amount / 100).toFixed(2)}`,
      cardBrand: payment.card_details?.card?.card_brand,
      last4: payment.card_details?.card?.last_4
    });

    res.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount_money.amount,
      receiptUrl: payment.receipt_url,
      cardDetails: payment.card_details,
    });

  } catch (error) {
    console.error('❌ Payment processing failed:', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Payment processing failed. Please try again or contact support.',
      systemError: error.message
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
      environment: 'Sandbox'
    }
  });
});

// Test endpoint to verify Square connection
app.get('/api/test-square', async (req, res) => {
  try {
    const response = await fetch('https://connect.squareupsandbox.com/v2/locations', {
      headers: {
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Square-Version': '2024-10-18',
      },
    });

    if (response.ok) {
      const data = await response.json();
      res.json({ 
        success: true, 
        message: 'Square API connection successful',
        locations: data.locations 
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to connect to Square API'
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
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/test-square`);
  console.log(`   POST http://localhost:${PORT}/api/process-payment`);
  console.log(`   POST http://localhost:${PORT}/api/bookings/create`);
});
