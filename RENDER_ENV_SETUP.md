# Render Environment Variables Setup

Your WhatsApp notifications aren't working because Render doesn't have the required environment variables. Follow these steps:

## Quick Setup (2 minutes)

1. **Go to Render Dashboard**: https://render.com/dashboard
2. **Find your service**: Click on `maha` service (mahalakshmihomepickles)
3. **Go to Environment**: Click the **"Environment"** tab on the left
4. **Add these environment variables** (copy from your `.env` file):

| Variable Name | Value |
|---|---|
| RAZORPAY_KEY_ID | `your_razorpay_key_id` |
| RAZORPAY_KEY_SECRET | `your_razorpay_key_secret` |
| TWILIO_ACCOUNT_SID | `your_twilio_account_sid` |
| TWILIO_AUTH_TOKEN | `your_twilio_auth_token` |
| TWILIO_WHATSAPP_FROM | `whatsapp:+1234567890` |
| ORDER_WHATSAPP_TO | `+91xxxxxxxxxx` |
| ORDER_EMAIL | `your_shop_email@example.com` |
| GMAIL_USER | `your_gmail_email@example.com` |
| GMAIL_PASSWORD | `your_gmail_app_password` |

**Note**: For `GMAIL_PASSWORD`, use an App Password (not your regular Gmail password).

## After Setting Variables

1. **Save Changes** in Render
2. **Trigger Redeploy**:
   - Go to the "Deployments" tab
   - Click the **"Deploy latest commit"** button
   - Wait for deployment to complete (usually 2-5 minutes)

## Verify It's Working

Once deployed, test by:
1. Going to https://mahalakshmihomepickles.onrender.com
2. Placing a test order with the Razorpay test card
3. Check your WhatsApp for the order confirmation

## Security Note

🔒 These are production credentials - keep them safe and don't commit to GitHub.
Always use Render's environment variable system for secrets.
