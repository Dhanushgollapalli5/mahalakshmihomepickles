# Render Deployment Guide

## Quick Start

### 1. Connect GitHub repo to Render

- Go to [render.com](https://render.com)
- Sign in with GitHub
- Click **New** → **Web Service**
- Select your `maha` repo
- Render will auto-detect `render.yaml` and pre-populate settings

### 2. Configure environment variables

In the Render dashboard, add all secrets marked `sync: false` in `render.yaml`:

```
RAZORPAY_KEY_ID          → Your Razorpay Live Key ID
RAZORPAY_KEY_SECRET      → Your Razorpay Live Secret
RAZORPAY_WEBHOOK_SECRET  → Your Razorpay webhook secret
TWILIO_ACCOUNT_SID       → Your Twilio Account SID
TWILIO_AUTH_TOKEN        → Your Twilio Auth Token
TWILIO_WHATSAPP_NUMBER   → Your Twilio WhatsApp sandbox number (e.g., whatsapp:+1425...)
WHATSAPP_RECIPIENT_NUMBER → Customer WhatsApp number (e.g., +91...)
GMAIL_USER               → Gmail address (for order emails)
GMAIL_APP_PASSWORD       → Gmail app password (not your regular password)
UPI_ID                   → Your UPI ID (optional)
```

### 3. Add custom domain

- Once deployed, go to **Settings** → **Custom Domain**
- Enter `mahalakshmihomepickles.com`
- Follow DNS steps to point your domain's CNAME to Render

### 4. Deploy

- Click **Create Web Service**
- Render builds and deploys automatically
- Once live, test: `https://mahalakshmihomepickles.com/api/config`
- Should return JSON with `razorpayKey` and `razorpayKeyId`

### 5. Enable auto-deploy

- Push changes to `main` branch
- Render auto-redeploys

## Troubleshooting

- **Build fails**: Check build logs in Render dashboard for npm/Node errors
- **Static files 404**: Ensure `index.html` and static assets are served by `server.js`
- **API 404**: Verify nginx config routes `/api/*` correctly (if using custom domain with proxy)
- **TLS issues**: Render provides free SSL; no Certbot needed
