# Mahalakshmi Home Pickles - Payment System Setup Guide

## Quick Start

### 1. Start the Server
```bash
npm start
```
Server will run on `http://localhost:3000`

### 2. Access the Website
Open your browser to:
- Local: `http://localhost:3000`
- Or open `index.html` directly (limited payment features without server)

## Payment System Features

### ✅ Currently Working
- **Razorpay Integration**: Live payment gateway configured
  - Order Creation: ✓ Working
  - Signature Verification: ✓ Working
  - Payment Processing: ✓ Ready

- **Cart System**: 
  - Add/Remove items: ✓ Working
  - Cart persistence: ✓ Using localStorage
  - Checkout: ✓ Ready

- **Order Flow**:
  - Product selection: ✓ Working
  - Cart management: ✓ Working
  - Order form: ✓ Ready
  - Payment modal: ✓ Ready

### ⚙️ Configuration Required

#### Option 1: Enable Email Notifications
```
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Copy the 16-character password
4. Update .env:
   GMAIL_USER=your-email@gmail.com
   GMAIL_PASSWORD=<16-char password>
   ORDER_EMAIL=recipient@example.com
5. Restart server: npm start
```

#### Option 2: Enable WhatsApp Notifications (Optional)
```
1. Create Twilio account: https://www.twilio.com/console
2. Get WhatsApp Sandbox credentials
3. Update .env with:
   TWILIO_ACCOUNT_SID=<your-sid>
   TWILIO_AUTH_TOKEN=<your-token>
   TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
   ORDER_WHATSAPP_TO=+919876543210
4. Restart server: npm start
```

## Payment Flow

### For Customers
1. Browse products
2. Select items (checkbox)
3. Click "Order Selected Items" or add to cart
4. Enter delivery details in checkout form
5. Click "Pay Now"
6. Complete Razorpay payment
7. Receive order confirmation

### For Admin
1. Check `.env` for notification setup
2. Orders are verified using Razorpay signature
3. Emails sent to: `ORDER_EMAIL` in .env
4. WhatsApp notifications to: `ORDER_WHATSAPP_TO` in .env

## Testing Payments

### Test Mode (Optional)
Use Razorpay test credentials:
```
Key ID: rzp_test_[test-id]
Key Secret: [test-secret]
```

### Test Payment Details
- Card: 4111111111111111
- Expiry: Any future date
- CVV: Any 3 digits

## Troubleshooting

### Server Won't Start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill existing process
kill -9 <PID>

# Restart
npm start
```

### Payment Not Loading
- Ensure server is running: `npm start`
- Check browser console for errors (F12)
- Verify `.env` has valid RAZORPAY_KEY_ID

### Emails Not Sending
- Verify Gmail settings (GMAIL_USER, GMAIL_PASSWORD)
- Check if App Password is generated (not regular password)
- Look for server logs: `error: Failed to send email`

### Cart Not Working
- Enable JavaScript in browser
- Check localStorage is not disabled
- Clear browser cache if needed

## File Structure

```
maha/
├── index.html           # Main website
├── script.js            # Frontend logic & cart
├── server.js            # Backend payment processing
├── styles.css           # Styling
├── .env                 # Configuration (⚠️ Keep private!)
├── package.json         # Dependencies
└── images/              # Product images
```

## API Endpoints

### GET `/api/config`
Returns Razorpay public key
```bash
curl http://localhost:3000/api/config
```

### POST `/api/create-order`
Creates a payment order
```bash
curl -X POST http://localhost:3000/api/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount":10000}'
```

### POST `/api/verify-payment`
Verifies payment signature and sends notifications
```bash
curl -X POST http://localhost:3000/api/verify-payment \
  -H "Content-Type: application/json" \
  -d '{...payment details...}'
```

## Security Notes

⚠️ **Important:**
1. Never commit `.env` to git - add to `.gitignore`
2. Keep RAZORPAY_KEY_SECRET private
3. Always verify signatures (already implemented)
4. Use HTTPS in production
5. Store credentials securely

## Support

For issues:
1. Check server logs: `npm start`
2. Verify `.env` configuration
3. Check browser console (F12)
4. Ensure Node.js v16+ is installed

---

**Status**: ✅ All payment systems configured and ready!
