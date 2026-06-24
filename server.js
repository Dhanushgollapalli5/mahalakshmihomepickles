const path = require('path');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const {
  PORT = 3000,
  GMAIL_USER,
  GMAIL_PASSWORD,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM,
  ORDER_EMAIL,
  ORDER_WHATSAPP_TO,
  CALLMEBOT_API_KEY,
  CALLMEBOT_PHONE,
  WHATSAPP_PROVIDER: WHATSAPP_PROVIDER_ENV,
  PAYMENT_MODE = 'razorpay',
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET
} = process.env;

const WHATSAPP_PROVIDER = (WHATSAPP_PROVIDER_ENV || '').toLowerCase();

const isRazorpayMode = PAYMENT_MODE === 'razorpay';
const isOfflineMode = PAYMENT_MODE === 'offline';
let effectivePaymentMode = PAYMENT_MODE;

if (!isRazorpayMode && !isOfflineMode) {
  console.error(`PAYMENT_MODE=${PAYMENT_MODE} is not supported. Use razorpay or offline.`);
  process.exit(1);
}

const razorpay = isRazorpayMode ? new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
}) : null;

if (isRazorpayMode && (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET)) {
  console.error('PAYMENT_MODE=razorpay but RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Aborting startup.');
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

function normalizeWhatsAppNumber(rawNumber) {
  if (!rawNumber) return null;
  const cleaned = rawNumber.trim().replace(/[^+0-9]/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('91') && cleaned.length >= 12) {
    return `+${cleaned}`;
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  return `+${cleaned}`;
}

function formatCallMeBotNumber(rawNumber) {
  if (!rawNumber) return null;
  const digits = rawNumber.trim().replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits.replace(/^0+/, '');
}

async function sendOrderWhatsAppCallMeBot(orderData) {
  if (!CALLMEBOT_API_KEY || !CALLMEBOT_PHONE) {
    throw new Error('CallMeBot configuration is missing');
  }

  const { orderId, amount, customerName, customerEmail, orderSummary } = orderData;
  const customerTarget = formatCallMeBotNumber(orderData.customerPhone);
  const adminTarget = formatCallMeBotNumber(CALLMEBOT_PHONE);
  const targetPhone = customerTarget || adminTarget;

  if (!targetPhone) {
    throw new Error('No valid WhatsApp recipient number for CallMeBot');
  }

  const msg = `✅ New Payment!\n` +
    `👤 Name: ${customerName}\n` +
    `📧 Email: ${customerEmail || 'N/A'}\n` +
    `💰 Amount: ₹${amount}\n` +
    `🛒 Product: ${orderSummary}\n` +
    `🔖 Order ID: ${orderId}`;

  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone', targetPhone);
  url.searchParams.set('text', msg);
  url.searchParams.set('apikey', CALLMEBOT_API_KEY);

  const response = await fetch(url.toString());
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`CallMeBot request failed: ${response.status} ${response.statusText}`);
  }
  if (body.toLowerCase().includes('error') || body.toLowerCase().includes('failed')) {
    throw new Error(`CallMeBot response error: ${body}`);
  }

  console.log('CallMeBot WhatsApp sent to:', targetPhone);
  return { success: true, targetPhone, provider: 'callmebot' };
}

// Send email notification
async function sendOrderEmail(orderData) {
  if (!GMAIL_USER || !ORDER_EMAIL) {
    console.warn('Email notifications disabled: missing credentials');
    return;
  }

  const { orderId, amount, customerName, customerEmail, customerPhone, orderDetails, deliveryAddress, paymentMethod = 'Razorpay' } = orderData;

  const paymentParagraph = `<p>Your payment of <strong>₹${amount}</strong> has been received via <strong>Razorpay</strong>. Thank you!</p>`;

  const emailContent = `
    <h2>Order Confirmation - Mahalakshmi Home Pickles</h2>
    <p>Dear ${customerName},</p>
    <p>Thank you! We have received your order request.</p>
    ${paymentParagraph}
    <h3>Order Details</h3>
    <ul>
      <li><strong>Order ID:</strong> ${orderId}</li>
      <li><strong>Amount:</strong> ₹${amount}</li>
      <li><strong>Payment Method:</strong> ${paymentMethod}</li>
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
  const provider = (orderData && orderData.whatsappProvider) ? String(orderData.whatsappProvider).toLowerCase() : (WHATSAPP_PROVIDER || (CALLMEBOT_API_KEY ? 'callmebot' : (twilioClient ? 'twilio' : 'none')));

  if (provider === 'callmebot') {
    return sendOrderWhatsAppCallMeBot(orderData);
  }

  if (provider === 'twilio') {
    if (!twilioClient || !TWILIO_WHATSAPP_FROM) {
      throw new Error('Twilio WhatsApp is not configured');
    }

    const { orderId, amount, customerName, customerPhone, orderSummary, paymentMethod = 'Razorpay' } = orderData;
    const customerTarget = normalizeWhatsAppNumber(customerPhone);
    const adminTarget = normalizeWhatsAppNumber(ORDER_WHATSAPP_TO);
    const targets = [...new Set([customerTarget, adminTarget].filter(Boolean))];

    if (targets.length === 0) {
      throw new Error('No valid WhatsApp recipient number for Twilio');
    }

    const paymentLine = `Payment received via Razorpay`;
    const message = `\nMahalakshmi Home Pickles - Order Confirmation\n\nOrder ID: ${orderId}\nAmount: ₹${amount}\n${paymentLine}\nCustomer: ${customerName}\n\n${orderSummary}\n\nThank you!\n  `.trim();

    const results = await Promise.allSettled(targets.map(async (targetPhone) => {
      const result = await twilioClient.messages.create({
        body: message,
        from: TWILIO_WHATSAPP_FROM,
        to: `whatsapp:${targetPhone}`
      });
      console.log('WhatsApp message sent to:', targetPhone, 'SID:', result.sid);
      return { targetPhone, sid: result.sid };
    }));

    const successful = results.filter((item) => item.status === 'fulfilled').map((item) => item.value.targetPhone);
    const failed = results.filter((item) => item.status === 'rejected').map((item) => ({ reason: item.reason?.message || item.reason }));

    if (successful.length === 0) {
      console.error('Failed to send WhatsApp:', failed);
      throw new Error('Failed to send WhatsApp to any configured recipient');
    }

    return {
      success: true,
      sentTo: successful,
      failed,
      provider: 'twilio'
    };
  }

  throw new Error('WhatsApp notifications disabled: no provider configured');
}

const app = express();

// CORS configuration for production
const corsOptions = {
  origin: [
    'https://mahalakshmihomepickles.com',
    'https://www.mahalakshmihomepickles.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/api/config', (req, res) => {
  res.json({
    razorpayKey: RAZORPAY_KEY_ID || '',
    razorpayKeyId: RAZORPAY_KEY_ID || '',
    currency: process.env.CURRENCY || 'INR',
    paymentMode: PAYMENT_MODE || effectivePaymentMode || 'offline',
    upiId: process.env.UPI_ID || ''
  });
});

app.post('/api/create-order', async (req, res) => {
  if (!isRazorpayMode) {
    return res.status(400).json({ success: false, error: 'Online order creation is not supported in offline payment mode.' });
  }
  if (!razorpay) {
    return res.status(400).json({ success: false, error: 'Razorpay is not configured.' });
  }

  const { amount, currency = 'INR', receipt, notes = {} } = req.body;
  if (!amount || amount <= 0 || !receipt) {
    return res.status(400).json({ success: false, error: 'Invalid order details' });
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt,
      payment_capture: 1,
      notes
    });
    return res.json({ success: true, order });
  } catch (error) {
    console.error('Failed to create Razorpay order:', error.message || error);
    return res.status(500).json({ success: false, error: 'Failed to create Razorpay order', details: error.message || error });
  }
});

function verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!RAZORPAY_KEY_SECRET) return false;
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(body).digest('hex');
  return expected === razorpay_signature;
}

app.post('/api/verify-payment', async (req, res) => {
  if (!isRazorpayMode) {
    return res.status(400).json({ success: false, error: 'Payment verification is not available in offline payment mode.' });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderNumber,
    amount,
    customerName,
    email,
    phone,
    address,
    orderSummary,
    paymentMethod = 'Razorpay'
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderNumber || !customerName || !phone) {
    return res.status(400).json({ success: false, error: 'Missing required payment verification fields' });
  }

  if (!verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
    console.warn('Invalid Razorpay signature for order', orderNumber);
    return res.status(400).json({ success: false, error: 'Invalid payment signature' });
  }

  const notificationData = {
    orderId: orderNumber,
    amount,
    customerName,
    customerEmail: email,
    customerPhone: phone,
    deliveryAddress: address,
    orderDetails: orderSummary,
    orderSummary,
    whatsappProvider: req.body.whatsappProvider || req.body.forceWhatsAppProvider,
    paymentMethod
  };

  try {
    const results = await Promise.allSettled([
      sendOrderEmail(notificationData),
      sendOrderWhatsApp(notificationData)
    ]);

    return res.json({
      success: true,
      emailSent: results[0].status === 'fulfilled',
      whatsappSent: results[1].status === 'fulfilled',
      results: results.map((result) => ({ status: result.status, reason: result.status === 'rejected' ? result.reason?.message || result.reason : undefined }))
    });
  } catch (error) {
    console.error('Payment verification notification failed:', error.message || error);
    return res.status(500).json({ success: false, error: 'Payment verification failed', details: error.message });
  }
});

app.post('/api/test-notification', async (req, res) => {
  const { customerName = 'Test User', customerEmail = ORDER_EMAIL, customerPhone = '919000000000', deliveryAddress = 'Test address', orderSummary = 'This is a test order summary.' } = req.body;

  const notificationData = {
    orderId: `TEST-${Date.now()}`,
    amount: 0,
    customerName,
    customerEmail,
    customerPhone,
    deliveryAddress,
    orderDetails: orderSummary,
    orderSummary,
    whatsappProvider: req.body.whatsappProvider || req.body.forceWhatsAppProvider,
    paymentMethod: 'Razorpay'
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

app.post('/api/order-notification', async (req, res) => {
  const { orderNumber, amount, customerName, email, phone, address, orderSummary, paymentMethod = 'Razorpay' } = req.body;

  if (!orderNumber || !customerName || !phone) {
    return res.status(400).json({ success: false, error: 'Missing required order fields' });
  }

  const notificationData = {
    orderId: orderNumber,
    amount,
    customerName,
    customerEmail: email,
    customerPhone: phone,
    deliveryAddress: address,
    orderDetails: orderSummary,
    orderSummary,
    whatsappProvider: req.body.whatsappProvider || req.body.forceWhatsAppProvider,
    paymentMethod
  };

  try {
    const results = await Promise.allSettled([
      sendOrderEmail(notificationData),
      sendOrderWhatsApp(notificationData)
    ]);

    return res.json({
      success: true,
      emailSent: results[0].status === 'fulfilled',
      whatsappSent: results[1].status === 'fulfilled',
      results: results.map((result) => ({ status: result.status, reason: result.status === 'rejected' ? result.reason?.message || result.reason : undefined }))
    });
  } catch (error) {
    console.error('Order notification failed:', error);
    return res.status(500).json({ success: false, error: 'Order notification failed', details: error.message });
  }
});

// Health check endpoint (for load balancers and monitoring)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
