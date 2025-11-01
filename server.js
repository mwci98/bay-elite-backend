// backend/server.js - Updated with Email Notifications
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// GoDaddy Email Configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtpout.secureserver.net',
    port: process.env.EMAIL_PORT || 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER || 'justin@neospec.co.in',
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Customer email template
const getCustomerEmailTemplate = (bookingData, bookingId) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1a365d, #2d3748); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px; }
        .booking-details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        .detail-item { margin: 10px 0; display: flex; justify-content: space-between; }
        .total { font-size: 20px; font-weight: bold; color: #059669; text-align: center; margin: 20px 0; padding: 15px; background: #f0fff4; border-radius: 8px; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; color: #718096; font-size: 14px; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">BAY ELITE LIMO</div>
          <h1>🎉 Booking Confirmed!</h1>
          <p>Your Luxury Transportation Experience Awaits</p>
        </div>
        <div class="content">
          <p>Dear <strong>${bookingData.firstName} ${bookingData.lastName}</strong>,</p>
          <p>Thank you for choosing Bay Elite Limo! Your booking has been confirmed.</p>
          
          <div class="booking-details">
            <h3 style="margin-top: 0; color: #2d3748;">📋 Booking Information</h3>
            <div class="detail-item">
              <span style="font-weight: 600; color: #4a5568;">Booking ID:</span>
              <span style="color: #2d3748;"><strong>${bookingId}</strong></span>
            </div>
            <div class="detail-item">
              <span style="font-weight: 600; color: #4a5568;">Service Type:</span>
              <span style="color: #2d3748; text-transform: capitalize;">${bookingData.serviceType}</span>
            </div>
            <div class="detail-item">
              <span style="font-weight: 600; color: #4a5568;">Vehicle Type:</span>
              <span style="color: #2d3748; text-transform: capitalize;">${bookingData.vehicleType}</span>
            </div>
            <div class="detail-item">
              <span style="font-weight: 600; color: #4a5568;">Pickup Date & Time:</span>
              <span style="color: #2d3748;"><strong>${bookingData.pickupDate} at ${bookingData.pickupTime}</strong></span>
            </div>
            <div class="detail-item">
              <span style="font-weight: 600; color: #4a5568;">Pickup Location:</span>
              <span style="color: #2d3748;">${bookingData.pickupAddress}</span>
            </div>
            ${bookingData.destination ? `
            <div class="detail-item">
              <span style="font-weight: 600; color: #4a5568;">Destination:</span>
              <span style="color: #2d3748;">${bookingData.destination}</span>
            </div>
            ` : ''}
            <div class="detail-item">
              <span style="font-weight: 600; color: #4a5568;">Number of Vehicles:</span>
              <span style="color: #2d3748;">${bookingData.passengers}</span>
            </div>
            <div class="detail-item">
              <span style="font-weight: 600; color: #4a5568;">Payment Method:</span>
              <span style="color: #2d3748; text-transform: capitalize;">${bookingData.paymentMethod}</span>
            </div>
          </div>

          <div class="total">
            💰 Total Amount: $${parseFloat(bookingData.totalAmount).toFixed(2)}
          </div>

          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Our team will contact you within 24 hours to confirm all details</li>
            <li>You'll receive driver information 2 hours before pickup</li>
            <li>For any changes, please contact us immediately</li>
          </ul>
        </div>
        <div class="footer">
          <p><strong>Bay Elite Limo Service</strong></p>
          <p>📍 Premium Luxury Transportation</p>
          <p>📧 justin@neospec.co.in</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Owner email template
const getOwnerEmailTemplate = (bookingData, bookingId) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 700px; margin: 0 auto; background: white; }
        .header { background: #dc2626; color: white; padding: 25px; text-align: center; }
        .content { padding: 25px; }
        .alert-section { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc2626; }
        .booking-section { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 15px 0; }
        .customer-section { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0369a1; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 NEW BOOKING RECEIVED - ACTION REQUIRED</h1>
          <p>Booking ID: ${bookingId}</p>
        </div>
        <div class="content">
          <div class="alert-section">
            <h2 style="margin-top: 0;">💰 New Revenue Opportunity</h2>
            <p style="color: #dc2626; font-weight: bold;">Amount: $${parseFloat(bookingData.totalAmount).toFixed(2)} | Status: ${bookingData.paymentMethod === 'credit' ? 'PAID' : 'CASH PAYMENT PENDING'}</p>
          </div>

          <div class="booking-section">
            <h3>📋 Booking Details</h3>
            <p><strong>Booking ID:</strong> ${bookingId}</p>
            <p><strong>Service Type:</strong> ${bookingData.serviceType}</p>
            <p><strong>Vehicle Type:</span> ${bookingData.vehicleType}</p>
            <p><strong>Pickup Date & Time:</strong> ${bookingData.pickupDate} at ${bookingData.pickupTime}</p>
            <p><strong>Pickup Address:</strong> ${bookingData.pickupAddress}</p>
            ${bookingData.destination ? `<p><strong>Destination:</strong> ${bookingData.destination}</p>` : ''}
            <p><strong>Vehicles Required:</strong> ${bookingData.passengers}</p>
            <p><strong>Total Amount:</strong> $${parseFloat(bookingData.totalAmount).toFixed(2)}</p>
            <p><strong>Payment Method:</strong> ${bookingData.paymentMethod}</p>
          </div>

          <div class="customer-section">
            <h3>👤 Customer Information</h3>
            <p><strong>Name:</strong> ${bookingData.firstName} ${bookingData.lastName}</p>
            <p><strong>Email:</strong> ${bookingData.email}</p>
            <p><strong>Phone:</strong> ${bookingData.phone}</p>
            ${bookingData.specialRequests ? `<p><strong>Special Requests:</strong> ${bookingData.specialRequests}</p>` : ''}
            ${bookingData.billingAddress ? `<p><strong>Billing Address:</strong> ${bookingData.billingAddress}</p>` : ''}
          </div>

          <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #d97706;">
            <h3>🎯 Required Actions</h3>
            <ol>
              <li><strong>Contact customer within 2 hours</strong> to confirm all details</li>
              <li>Assign appropriate vehicle and driver</li>
              <li>Update booking status in the system</li>
              <li>Send driver assignment confirmation</li>
            </ol>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send booking emails
const sendBookingEmails = async (bookingData, bookingId) => {
  try {
    console.log('📧 Starting email sending process...');
    
    const transporter = createTransporter();

    // Send customer confirmation
    const customerEmail = {
      from: `"Bay Elite Limo" <justin@neospec.co.in>`,
      to: bookingData.email,
      subject: `Booking Confirmation #${bookingId} - Bay Elite Limo`,
      html: getCustomerEmailTemplate(bookingData, bookingId)
    };

    // Send owner notification
    const ownerEmail = {
      from: `"Bay Elite Booking System" <justin@neospec.co.in>`,
      to: 'justin@neospec.co.in', // Send to yourself
      subject: `🚨 NEW BOOKING: ${bookingData.serviceType} - $${parseFloat(bookingData.totalAmount).toFixed(2)} - ${bookingId}`,
      html: getOwnerEmailTemplate(bookingData, bookingId)
    };

    // Send emails
    console.log('📤 Sending customer confirmation email...');
    await transporter.sendMail(customerEmail);
    console.log('✅ Customer email sent successfully');

    console.log('📤 Sending owner notification email...');
    await transporter.sendMail(ownerEmail);
    console.log('✅ Owner notification email sent successfully');

    return true;

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
};

// Payment processing endpoint - Direct Square API call
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

    // Direct API call to Square
    const squareResponse = await fetch('https://connect.squareupsandbox.com/v2/payments', {
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

// UPDATED Booking creation endpoint with Email Notifications
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

    const bookingId = `BK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    console.log('✅ Booking created:', {
      bookingId,
      customer: `${formData.firstName} ${formData.lastName}`,
      service: formData.serviceType,
      paymentStatus: paymentStatus || 'cash'
    });

    // Send email notifications
    console.log('📧 Sending email notifications...');
    let emailsSent = false;
    
    try {
      emailsSent = await sendBookingEmails(formData, bookingId);
      console.log('✅ Email sending result:', emailsSent);
    } catch (emailError) {
      console.error('❌ Email sending failed but continuing:', emailError);
    }

    res.json({
      success: true,
      bookingId,
      emailsSent,
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
    email: {
      configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      user: process.env.EMAIL_USER
    },
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

// Test email endpoint
app.get('/api/test-email', async (req, res) => {
  try {
    console.log('🧪 Testing email configuration...');
    
    const testBookingData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'justin@neospec.co.in',
      phone: '+1234567890',
      serviceType: 'hourly',
      vehicleType: 'suv',
      pickupDate: '2024-12-25',
      pickupTime: '14:00',
      pickupAddress: '123 Test Street, Test City',
      destination: '456 Destination Ave',
      passengers: 2,
      paymentMethod: 'credit',
      totalAmount: 250.00
    };

    const bookingId = `TEST${Date.now()}`;
    
    const emailsSent = await sendBookingEmails(testBookingData, bookingId);
    
    res.json({
      success: true,
      emailsSent,
      message: 'Test email sent successfully'
    });
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
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
  console.log(`   GET  http://localhost:${PORT}/api/test-email`);
  console.log(`   POST http://localhost:${PORT}/api/process-payment`);
  console.log(`   POST http://localhost:${PORT}/api/bookings/create`);
});
