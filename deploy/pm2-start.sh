#!/bin/bash
# PM2 startup helper for Maha app
# Usage:
# 1. Copy this script to the server into the project folder (e.g. /var/www/maha)
# 2. Make it executable: sudo chmod +x pm2-start.sh
# 3. Run it as a user that should own the process (e.g. ubuntu or www-data):
#    ./pm2-start.sh

pm2 start server.js --name maha --env production --watch
pm2 save
echo
echo "If this is the first time, run the following command as sudo to enable PM2 at boot:"
echo "  sudo $(pm2 startup systemd | sed -n 's/^\s*//p' | tail -n1)"
