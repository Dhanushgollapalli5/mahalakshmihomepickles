Deployment guide — host Node backend at mahalakshmihomepickles.com

Goal
- Run the Express backend at https://mahalakshmihomepickles.com and serve the frontend so `/api/config` and other API routes are reachable from your live site.

Options
- VPS (recommended): nginx reverse proxy + PM2 (or systemd) + Certbot (Let's Encrypt)
- Platform (faster): Render / Heroku / Fly / Railway

Prerequisites
- A server (VPS) with a public IP (Ubuntu 22.04+ recommended) OR a Render/Heroku account
- Domain `mahalakshmihomepickles.com` pointed with an A record to the server IP (or configured CNAME per host's docs)
- Repo cloned on the server or CI configured

VPS (nginx + PM2) — quick steps
1. SSH to server and install Node, npm, nginx, certbot, git, build tools

```bash
# Ubuntu example
sudo apt update
sudo apt install -y curl git nginx certbot python3-certbot-nginx build-essential
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
# verify
node -v && npm -v
```

2. Clone repo and install

```bash
cd /var/www
sudo git clone https://github.com/yourname/maha.git maha
cd maha
sudo npm ci
# copy your .env (securely) or create env file
sudo cp /home/ubuntu/secrets/.env .env
```

3. Start the app with PM2

```bash
sudo npm install -g pm2
# start app (adjust PORT if needed)
pm run start   # or: pm2 start server.js --name maha --env production
pm2 save
pm2 startup systemd  # follow printed instructions to enable on boot
```

4. Configure nginx as reverse proxy (sample in `deploy/nginx/maha.conf`), then enable it

```bash
sudo ln -s /etc/nginx/sites-available/maha.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

5. Obtain TLS certificate with Certbot

```bash
sudo certbot --nginx -d mahalakshmihomepickles.com -d www.mahalakshmihomepickles.com
```

6. Verify
- Visit https://mahalakshmihomepickles.com/api/config and expect JSON with `razorpayKey`/`razorpayKeyId`.
- If Razorpay secrets are not set yet, the app should still start and return `paymentMode: "offline"` so the API stays reachable.
- Ensure frontend is hosted on same domain or uses correct API base URL.

Troubleshooting notes
- Cloudflare: If you use Cloudflare proxy (orange cloud), ensure DNS points correctly and the proxy isn't interfering with API routing. If you route traffic to a different host (e.g., static site on GitHub Pages and API on VPS), set appropriate page rules or use a subdomain like `api.mahalakshmihomepickles.com`.
- CORS: If frontend origin differs from API, enable CORS in `server.js`:
```js
const cors = require('cors');
app.use(cors({ origin: ['https://mahalakshmihomepickles.com'] }));
```

Platform alternative — Render (fast)
- Create a new Web Service on Render.
- Connect your GitHub repo and set build commands `npm ci` and start command `npm start`.
- Add environment variables in Render dashboard (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, etc.).
- Add a custom domain `mahalakshmihomepickles.com` in Render and follow DNS steps.

If you want, I can generate a systemd unit file, PM2 startup commands for your server, or a Render deploy YAML — tell me which hosting provider you have and I'll produce precise commands and config files.
