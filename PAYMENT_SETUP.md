# Mahalakshmi Home Pickles — Payment & Order Setup

## Overview

Checkout uses **UPI QR payment** (PhonePe, Google Pay, Paytm, or any UPI app). After the customer pays, they confirm payment and the server sends **email** and **WhatsApp** notifications (when configured).

## Quick start

```bash
npm install
cp .env.example .env
# Edit .env with your UPI ID and notification credentials
npm start
```

Open `https://mahalakshmihomepickles.com/` and place a test order.

## Payment flow (customer)

1. Select products and open checkout (cart or catalogue).
2. Enter name, address, phone, and optional email.
3. Scan the UPI QR code and pay the exact total shown.
4. Check **“I have completed the UPI payment”** and tap **Confirm Order**.
5. View the success page; WhatsApp/email are sent if the server is configured.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default `3000`) |
| `UPI_ID` | No | Your UPI VPA (default `9700511609@ybl`) |
| `UPI_PAYEE_NAME` | No | Name shown in UPI apps |
| `GMAIL_USER` | For email | Gmail address for SMTP |
| `GMAIL_PASSWORD` | For email | Gmail [App Password](https://myaccount.google.com/apppasswords) |
| `ORDER_EMAIL` | For email | Shop inbox (also BCC on customer emails) |
| `TWILIO_ACCOUNT_SID` | For WhatsApp | Twilio Account SID (starts with `AC`) |
| `TWILIO_AUTH_TOKEN` | For WhatsApp | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | For WhatsApp | e.g. `whatsapp:+14155238886` (sandbox) |
| `ORDER_WHATSAPP_TO` | For WhatsApp | Fallback shop number if customer phone missing |
| `WHATSAPP_PROVIDER` | Optional | `twilio` or `callmebot`; defaults to CallMeBot if configured |
| `CALLMEBOT_API_KEY` | Optional | CallMeBot API key for WhatsApp order alerts |
| `CALLMEBOT_PHONE` | Optional | Your shop WhatsApp phone number in 91XXXXXXXXXX format |

## API endpoints

### `GET /api/config`

Returns UPI settings for the checkout UI:

```json
{
  "paymentMode": "upi",
  "upiId": "9700511609@ybl",
  "payeeName": "Mahalakshmi Home Pickles"
}
```

### `POST /api/order-notification`

Called after the customer confirms UPI payment. Sends email and WhatsApp.

```bash
curl -X POST http://localhost:3000/api/order-notification \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "MHP-123",
    "amount": 500,
    "customerName": "Test User",
    "email": "test@example.com",
    "phone": "919876543210",
    "address": "Hyderabad",
    "orderSummary": "1x Mango Pickle",
    "paymentMethod": "UPI"
  }'
```

### `POST /api/test-notification`

Sends a test email/WhatsApp using sample data (useful after configuring `.env`).

## WhatsApp notifications

### Option 1: CallMeBot (recommended for simple setup)

1. Go to https://wa.me/+34644523740 and send the message: `I allow callmebot to send me messages`
2. Copy the API key from the reply.
3. In your `.env` file, set:

```bash
WHATSAPP_PROVIDER=callmebot
CALLMEBOT_API_KEY=your_callmebot_api_key
CALLMEBOT_PHONE=919XXXXXXXXXX
```

4. Restart the server and place a test order, or call `/api/test-notification`.

### Option 2: Twilio WhatsApp

1. Create a [Twilio](https://www.twilio.com/console) account and open the WhatsApp sandbox.
2. Join the sandbox from your phone using the code Twilio provides.
3. Set `WHATSAPP_PROVIDER=twilio` and configure:

```bash
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
ORDER_WHATSAPP_TO=+919XXXXXXXXX
```

4. Restart the server and place a test order, or call `/api/test-notification`.

Customer phone numbers from checkout are used when valid; otherwise `ORDER_WHATSAPP_TO` is used.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| QR code does not load | Check internet access (QR is generated via a public API). UPI ID still works manually. |
| Notifications not sent | Verify `.env`, restart `npm start`, check server logs. |
| `file://` checkout | Run `npm start` and use `http://localhost:3000` so `/api/config` and notifications work. |
| WhatsApp fails | Confirm sandbox join, `TWILIO_ACCOUNT_SID` starts with `AC`, and numbers use `+91` format. |

## Security notes

- Do not commit `.env` to git.
- UPI payments are confirmed manually by the customer checkbox; verify payments in your UPI app before dispatching orders.
- Use HTTPS in production.

## File reference

- `script.js` — Cart, checkout modal, UPI QR, order submission
- `server.js` — `/api/config`, notifications
- `success.html` — Post-checkout confirmation page
- `.env.example` — Template for configuration
