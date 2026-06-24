# Razorpay Online Payment Setup — Mahalakshmi Home Pickles

Razorpay enables secure online payment with card, UPI, netbanking, and wallet options. Your project is ready to use it!

## Quick Start (5 minutes)

### 1. Get Razorpay Keys

1. Create a free account at [Razorpay](https://razorpay.com)
2. Sign in to [Razorpay Dashboard](https://dashboard.razorpay.com)
3. Go to **Settings** → **API Keys**
4. Copy your **Key ID** and **Key Secret** (test or live)

### 2. Update `.env` File

Edit `.env` in your project root:

```bash
# Razorpay Payment Gateway
PAYMENT_MODE=razorpay
RAZORPAY_KEY_ID=rzp_live_T2CsLmF6Wwd9Vh
RAZORPAY_KEY_SECRET=DA1ASI5FFkapuPFTfX7RAYwq
```

Replace `YOUR_KEY_ID_HERE` and `YOUR_KEY_SECRET_HERE` with your actual Razorpay keys.

### 3. Restart Server

```bash
npm start
```

Visit `https://mahalakshmihomepickles.com/` and test the checkout!

---

## Payment Flow (Customer)

1. **Select Products** → Browse catalogue and add items to cart
2. **Enter Details** → Name, address, phone, email in checkout
3. **Pay via Razorpay** → Click "Pay Now" button
4. **Choose Payment Method** → Card, UPI, Netbanking, Wallet
5. **Receive Confirmation** → Order confirmed with number, email & WhatsApp sent

---

## Test Keys vs. Live Keys

### Test Mode (Development)
- **Key ID**: `rzp_test_XXXXX`
- **Use for testing** without real charges
- Test card: `4111 1111 1111 1111` with any future expiry/CVV

### Live Mode (Production)
- **Key ID**: `rzp_live_XXXXX`
- **Real payments** from customers
- Requires bank account verification on Razorpay

### Switching Between Test and Live

Edit `.env`:
```bash
# For testing:
RAZORPAY_KEY_ID=rzp_test_YOUR_TEST_KEY

# For production:
RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY
```

---

## Environment Variables Explained

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYMENT_MODE` | Yes | Set to `razorpay` to enable Razorpay checkout |
| `RAZORPAY_KEY_ID` | Yes | Your Razorpay Key ID (test or live) |
| `RAZORPAY_KEY_SECRET` | Yes | Your Razorpay Key Secret |
| `GMAIL_USER` | No | Email for order notifications |
| `GMAIL_PASSWORD` | No | App-specific Gmail password |
| `ORDER_EMAIL` | No | Shop email to receive orders |
| `TWILIO_ACCOUNT_SID` | No | Twilio SID for WhatsApp notifications |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | No | Twilio WhatsApp sandbox number |
| `ORDER_WHATSAPP_TO` | No | Your shop WhatsApp number for order alerts |
| `WHATSAPP_PROVIDER` | No | `twilio` or `callmebot`. Defaults to callmebot if configured |
| `CALLMEBOT_API_KEY` | No | CallMeBot API key for WhatsApp alerts |
| `CALLMEBOT_PHONE` | No | CallMeBot recipient phone number in 91XXXXXXXXXX format |
| `UPI_ID` | No | Fallback UPI ID if payment mode is changed to `upi` |

---

## API Endpoints (Backend)

### `GET /api/config`

Returns payment configuration to the frontend.

**Response:**
```json
{
  "paymentMode": "razorpay",
  "razorpayKeyId": "rzp_live_YOUR_KEY",
  "upiId": "9700511609@ybl",
  "payeeName": "Mahalakshmi Home Pickles"
}
```

### `POST /api/create-order`

Creates a Razorpay order for payment. Called by frontend when customer clicks "Pay Now".

**Request:**
```json
{
  "amount": 630,
  "currency": "INR",
  "receipt": "MHP-2401011030",
  "notes": {
    "customerName": "John Doe",
    "email": "john@example.com",
    "phone": "919876543210",
    "address": "Hyderabad, AP"
  }
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_xxxxx",
    "entity": "order",
    "amount": 63000,
    "currency": "INR",
    "receipt": "MHP-2401011030",
    "created_at": 1704123456
  }
}
```

### `POST /api/verify-payment`

Verifies the Razorpay payment signature after customer pays. Sends order confirmation via email/WhatsApp.

**Request:**
```json
{
  "razorpay_order_id": "order_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "signature_hash",
  "orderNumber": "MHP-2401011030",
  "amount": 630,
  "customerName": "John Doe",
  "email": "john@example.com",
  "phone": "919876543210",
  "address": "Hyderabad, AP",
  "orderSummary": "Order details here...",
  "paymentMethod": "Razorpay"
}
```

**Response:**
```json
{
  "success": true,
  "emailSent": true,
  "whatsappSent": true,
  "results": [...]
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Razorpay is not configured" error** | Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env`, restart server |
| **"Razorpay checkout not opening"** | Ensure Key ID is correct, check browser console for errors |
| **"Invalid payment signature"** | Key Secret might be wrong; verify on Razorpay dashboard |
| **Notifications not sent** | Configure Gmail/Twilio in `.env`, verify credentials |
| **Orders showing in test but not live** | Switch `RAZORPAY_KEY_ID` from test to live keys |
| **Payment works but no email/WhatsApp** | Verify `ORDER_EMAIL` and `ORDER_WHATSAPP_TO` in `.env` |

---

## Security Notes

- **Do not commit `.env` to git** — it contains sensitive keys
- Razorpay SDK verifies signatures server-side for fraud prevention
- All payment data encrypted in transit (HTTPS recommended for production)
- Customer phone/email only stored in order notifications, not persisted

---

## Next Steps

1. **Test the payment flow:**
   - Use test keys with test card `4111 1111 1111 1111`
   - Place a test order through your site

2. **Configure email notifications:**
   - Set up Gmail App Password
   - Add `GMAIL_USER`, `GMAIL_PASSWORD`, `ORDER_EMAIL` to `.env`

3. **Configure WhatsApp notifications:**
   - Set up Twilio account and WhatsApp sandbox
   - Add Twilio credentials to `.env`

4. **Switch to live mode:**
   - Replace test keys with live keys
   - Test one real order
   - Monitor Razorpay dashboard for payments

---

## Support

- **Razorpay Help**: https://razorpay.com/docs
- **API Docs**: https://razorpay.com/api
- **Dashboard**: https://dashboard.razorpay.com

---

**Mahalakshmi Home Pickles — Ready to accept online payments!**
