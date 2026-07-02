#!/bin/bash
# Run this script ON the Hostinger VPS as root
# Usage: bash deploy.sh

set -e
DOMAIN=studio.pratishthabridal.in
APP_DIR=/var/www/studio-app

echo "=== 1. Update system ==="
apt update -y && apt upgrade -y

echo "=== 2. Install Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "=== 3. Install PM2 & Nginx ==="
npm install -g pm2
apt install -y nginx certbot python3-certbot-nginx

echo "=== 4. Create app directory ==="
mkdir -p $APP_DIR

echo "=== 5. Copy files (run from your local machine) ==="
echo "After this script exits, run from your Windows machine:"
echo "  scp -r app/ root@213.210.37.67:$APP_DIR/"
echo "Then reconnect and run: bash $APP_DIR/deploy-step2.sh"

cat > /root/deploy-step2.sh <<'STEP2'
#!/bin/bash
set -e
APP_DIR=/var/www/studio-app
DOMAIN=studio.pratishthabridal.in

echo "=== Install backend deps ==="
cd $APP_DIR/backend
npm install --production

echo "=== Build frontend ==="
cd $APP_DIR/frontend
npm install
npm run build

echo "=== Copy built frontend to backend public ==="
cp -r dist/ $APP_DIR/backend/public/

echo "=== Configure Nginx ==="
cat > /etc/nginx/sites-available/studio <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location / {
        root $APP_DIR/backend/public;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/studio /etc/nginx/sites-enabled/studio
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== Start backend with PM2 ==="
cd $APP_DIR/backend
pm2 delete studio-backend 2>/dev/null || true
pm2 start server.js --name studio-backend --env production
pm2 save
pm2 startup systemd -u root --hp /root

echo "=== Setup SSL ==="
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m dhadukmanish@gmail.com

echo "=== Done! App running at https://$DOMAIN ==="
STEP2

chmod +x /root/deploy-step2.sh
echo "deploy-step2.sh written to /root/. Follow instructions above."
