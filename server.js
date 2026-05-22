const path = require('path');
const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, PORT = 3000, GMAIL_USER, GMAIL_PASSWORD, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, ORDER_EMAIL, ORDER_WHATSAPP_TO } = process.env;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env');
  process.exit(1);
}

// Initialize email transporter
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASSWORD
  }
});

// Initialize Twilio client
let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  if (TWILIO_ACCOUNT_SID.startsWith('AC')) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  } else {
    console.warn('Invalid TWILIO_ACCOUNT_SID value; Twilio notifications are disabled.');
  }
}

// Send email notification
async function sendOrderEmail(orderData) {
  if (!GMAIL_USER || !ORDER_EMAIL) {
    console.warn('Email notifications disabled: missing credentials');
    return;
  }

  const { orderId, paymentId, amount, customerName, customerEmail, customerPhone, orderDetails, deliveryAddress } = orderData;

  const emailContent = `
    <h2>Order Confirmation - Mahalakshmi Home Pickles</h2>
    <p>Dear ${customerName},</p>
    <p>Your payment has been received successfully!</p>
    
    <h3>Order Details</h3>
    <ul>
      <li><strong>Order ID:</strong> ${orderId}</li>
      <li><strong>Payment ID:</strong> ${paymentId}</li>
      <li><strong>Amount Paid:</strong> ₹${amount}</li>
      <li><strong>Date:</strong> ${new Date().toLocaleString('en-IN')}</li>
    </ul>
    
    <h3>Products Ordered</h3>
    <pre>${orderDetails}</pre>
    
    <h3>Delivery Address</h3>
    <p>${deliveryAddress}</p>
    
    <h3>Contact</h3>
    <p><strong>Phone:</strong> ${customerPhone}</p>
    <p><strong>Email:</strong> ${customerEmail}</p>
    
    <p>Thank you for your order! We'll contact you soon with delivery updates.</p>
    <p><strong>Mahalakshmi Home Pickles</strong></p>
  `;

  try {
    const mailOptions = {
      from: GMAIL_USER,
      subject: `Order Confirmation #${orderId}`,
      html: emailContent
    };

    if (customerEmail) {
      mailOptions.to = customerEmail;
      mailOptions.bcc = ORDER_EMAIL;
    } else {
      mailOptions.to = ORDER_EMAIL;
    }

    await emailTransporter.sendMail(mailOptions);
    console.log('Order email sent to:', mailOptions.to, mailOptions.bcc ? `bcc: ${mailOptions.bcc}` : '');
  } catch (error) {
    console.error('Failed to send email:', error.message);
  }
}

// Send WhatsApp notification
async function sendOrderWhatsApp(orderData) {
  if (!twilioClient || !ORDER_WHATSAPP_TO) {
    console.warn('WhatsApp notifications disabled: missing Twilio credentials or recipient');
    return;
  }

  const { orderId, paymentId, amount, customerName, orderSummary } = orderData;

  const message = `
Mahalakshmi Home Pickles - Order Confirmation

Order ID: ${orderId}
Payment ID: ${paymentId}
Amount: ₹${amount}
Customer: ${customerName}

${orderSummary}

Thank you for your order!
  `.trim();

  try {
    await twilioClient.messages.create({
      body: message,
      from: TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${ORDER_WHATSAPP_TO}`
    });
    console.log('WhatsApp message sent to:', ORDER_WHATSAPP_TO);
  } catch (error) {
    console.error('Failed to send WhatsApp:', error.message);
  }
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/api/config', (req, res) => {
  res.json({ keyId: RAZORPAY_KEY_ID });
});

app.post('/api/create-order', async (req, res) => {
  const { amount, currency = 'INR', receipt } = req.body;
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount < 100) {
    return res.status(400).json({ error: 'Invalid amount. Minimum amount is 100 paise.' });
  }

  try {
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
    });

    return res.json({ order_id: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    const status = error.statusCode === 401 ? 401 : 500;
    return res.status(status).json({ error: error.error?.description || 'Unable to create order' });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderNumber,
    amount,
    customerName,
    customerEmail,
    customerPhone,
    deliveryAddress,
    orderSummary
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing required payment verification fields.' });
  }

  const generatedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Signature verification failed.' });
  }

  const notificationData = {
    orderId: orderNumber || razorpay_order_id,
    paymentId: razorpay_payment_id,
    amount,
    customerName,
    customerEmail,
    customerPhone,
    deliveryAddress,
    orderDetails: orderSummary || '',
    orderSummary: orderSummary || ''
  };

  try {
    await Promise.allSettled([
      sendOrderEmail(notificationData),
      sendOrderWhatsApp(notificationData)
    ]);
  } catch (notificationError) {
    console.error('Notification error:', notificationError);
  }

  return res.json({ success: true, order_id: razorpay_order_id, payment_id: razorpay_payment_id });
});

app.post('/api/test-notification', async (req, res) => {
  const { customerName = 'Test User', customerEmail = ORDER_EMAIL, customerPhone = '919000000000', deliveryAddress = 'Test address', orderSummary = 'This is a test order summary.' } = req.body;

  const notificationData = {
    orderId: `TEST-${Date.now()}`,
    paymentId: `TESTPAY-${Date.now()}`,
    amount: 0,
    customerName,
    customerEmail,
    customerPhone,
    deliveryAddress,
    orderDetails: orderSummary,
    orderSummary
  };

  try {
    const results = await Promise.allSettled([
      sendOrderEmail(notificationData),
      sendOrderWhatsApp(notificationData)
    ]);

    return res.json({
      success: true,
      email: !!GMAIL_USER && !!ORDER_EMAIL,
      whatsapp: !!twilioClient,
      results: results.map((result) => ({ status: result.status, reason: result.status === 'rejected' ? result.reason?.message || result.reason : undefined }))
    });
  } catch (error) {
    console.error('Notification test failed:', error);
    return res.status(500).json({ error: 'Notification test failed', details: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
