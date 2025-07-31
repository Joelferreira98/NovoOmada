#!/bin/bash

# Omada WiFi Voucher Management System - Installation Script
# This script installs and configures the system on a Linux server

set -e

echo "🚀 Starting Omada Voucher System Installation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons."
   print_status "Please run as a regular user with sudo privileges."
   exit 1
fi

# Get system information
print_header "Detecting system information..."
OS=$(lsb_release -si 2>/dev/null || echo "Unknown")
VERSION=$(lsb_release -sr 2>/dev/null || echo "Unknown")
print_status "Operating System: $OS $VERSION"

# Update system packages
print_header "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required system dependencies
print_header "Installing system dependencies..."
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    nginx \
    mysql-server \
    certbot \
    python3-certbot-nginx \
    ufw \
    htop \
    unzip

# Install Node.js 20
print_header "Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

NODE_VERSION=$(node --version)
print_status "Node.js installed: $NODE_VERSION"

# Install PM2 for process management
print_header "Installing PM2..."
sudo npm install -g pm2

# Create application user
APP_USER="omada-voucher"
print_header "Creating application user: $APP_USER"
if ! id "$APP_USER" &>/dev/null; then
    sudo useradd -m -s /bin/bash $APP_USER
    sudo usermod -aG sudo $APP_USER
    print_status "User $APP_USER created"
else
    print_status "User $APP_USER already exists"
fi

# Set up application directory
APP_DIR="/opt/omada-voucher"
print_header "Setting up application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $APP_USER:$APP_USER $APP_DIR

# Configure MySQL
print_header "Configuring MySQL..."
sudo mysql_secure_installation

# Create database and user
print_status "Creating database and user..."
DB_NAME="omada_voucher"
DB_USER="omada_user"
DB_PASSWORD=$(openssl rand -base64 32)

sudo mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"
sudo mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
sudo mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

print_status "Database created: $DB_NAME"
print_status "Database user created: $DB_USER"

# Configure firewall
print_header "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000
sudo ufw status

# Create environment file template
print_header "Creating environment configuration..."
cat > /tmp/env.template << EOF
# Database Configuration
DATABASE_URL=mysql://$DB_USER:$DB_PASSWORD@localhost:3306/$DB_NAME
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Application Configuration
NODE_ENV=production
PORT=3000
SESSION_SECRET=$(openssl rand -base64 64)

# Omada Controller Configuration (to be filled by user)
OMADA_URL=https://your-omada-controller.com:8043
OMADA_CLIENT_ID=your_client_id
OMADA_CLIENT_SECRET=your_client_secret
OMADA_OMADAC_ID=your_omadac_id

# Optional: SSL Configuration
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
EOF

sudo mv /tmp/env.template $APP_DIR/.env.template
sudo chown $APP_USER:$APP_USER $APP_DIR/.env.template

# Create deployment script
print_header "Creating deployment script..."
cat > /tmp/deploy.sh << 'EOF'
#!/bin/bash

# Deployment script for Omada Voucher System
set -e

APP_DIR="/opt/omada-voucher"
APP_USER="omada-voucher"
REPO_URL="https://github.com/Joelferreira98/NovoOmada.git"

print_status() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

print_header() {
    echo -e "\033[0;34m[STEP]\033[0m $1"
}

print_header "Starting deployment..."

# Switch to app user
cd $APP_DIR

# If this is first deployment, clone the repository
if [ ! -d ".git" ]; then
    print_header "Cloning repository..."
    git clone $REPO_URL .
else
    print_header "Pulling latest changes..."
    git pull origin main
fi

# Install dependencies
print_header "Installing dependencies..."
npm ci --production

# Build application
print_header "Building application..."
npm run build

# Run database migrations
print_header "Running database migrations..."
npm run db:push

# Restart application with PM2
print_header "Restarting application..."
pm2 delete omada-voucher 2>/dev/null || true
pm2 start dist/index.js --name omada-voucher --user $APP_USER
pm2 save

print_status "Deployment completed successfully!"
EOF

sudo mv /tmp/deploy.sh $APP_DIR/deploy.sh
sudo chmod +x $APP_DIR/deploy.sh
sudo chown $APP_USER:$APP_USER $APP_DIR/deploy.sh

# Create Nginx configuration
print_header "Creating Nginx configuration..."
cat > /tmp/omada-voucher.nginx << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
    }

    # Security
    location ~ /\. {
        deny all;
    }
}
EOF

sudo mv /tmp/omada-voucher.nginx /etc/nginx/sites-available/omada-voucher
sudo ln -sf /etc/nginx/sites-available/omada-voucher /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Create systemd service for auto-start
print_header "Creating systemd service..."
cat > /tmp/omada-voucher.service << EOF
[Unit]
Description=Omada Voucher System
After=network.target mysql.service

[Service]
Type=forking
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/pm2 start dist/index.js --name omada-voucher
ExecReload=/usr/bin/pm2 reload omada-voucher
ExecStop=/usr/bin/pm2 stop omada-voucher
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/omada-voucher.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable omada-voucher

# Create backup script
print_header "Creating backup script..."
cat > /tmp/backup.sh << 'EOF'
#!/bin/bash

# Backup script for Omada Voucher System
BACKUP_DIR="/var/backups/omada-voucher"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="omada_voucher"
DB_USER="omada_user"

mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u $DB_USER -p $DB_NAME > $BACKUP_DIR/database_$DATE.sql

# Application files backup
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C /opt omada-voucher

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

sudo mv /tmp/backup.sh /usr/local/bin/omada-voucher-backup
sudo chmod +x /usr/local/bin/omada-voucher-backup

# Add backup to crontab
print_header "Setting up automated backups..."
echo "0 2 * * * /usr/local/bin/omada-voucher-backup" | sudo crontab -u root -

# Create log rotation
print_header "Setting up log rotation..."
cat > /tmp/omada-voucher-logrotate << 'EOF'
/opt/omada-voucher/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 omada-voucher omada-voucher
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

sudo mv /tmp/omada-voucher-logrotate /etc/logrotate.d/omada-voucher

# Create installation summary
print_header "Creating installation summary..."
cat > $APP_DIR/INSTALLATION_SUMMARY.md << EOF
# Omada Voucher System - Installation Summary

## Installation completed on: $(date)

### Database Information
- Database Name: $DB_NAME
- Database User: $DB_USER
- Database Password: $DB_PASSWORD

### Directory Structure
- Application Directory: $APP_DIR
- Configuration File: $APP_DIR/.env.template
- Deployment Script: $APP_DIR/deploy.sh
- Nginx Configuration: /etc/nginx/sites-available/omada-voucher

### Services
- Systemd Service: omada-voucher
- Process Manager: PM2
- Web Server: Nginx

### Security
- Firewall: UFW enabled
- SSL: Ready for Let's Encrypt
- Application User: $APP_USER (non-root)

### Backup
- Script: /usr/local/bin/omada-voucher-backup
- Schedule: Daily at 2:00 AM
- Location: /var/backups/omada-voucher

## Next Steps

1. **Configure Environment Variables**
   \`\`\`bash
   sudo -u $APP_USER cp $APP_DIR/.env.template $APP_DIR/.env
   sudo -u $APP_USER nano $APP_DIR/.env
   \`\`\`

2. **Update Domain in Nginx**
   \`\`\`bash
   sudo nano /etc/nginx/sites-available/omada-voucher
   # Replace 'your-domain.com' with your actual domain
   sudo nginx -t && sudo systemctl reload nginx
   \`\`\`

3. **Deploy Application**
   \`\`\`bash
   sudo -u $APP_USER $APP_DIR/deploy.sh
   \`\`\`

4. **Setup SSL Certificate**
   \`\`\`bash
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   \`\`\`

5. **Start Services**
   \`\`\`bash
   sudo systemctl start omada-voucher
   sudo systemctl start nginx
   \`\`\`

## Monitoring Commands
- Check application status: \`pm2 status\`
- View application logs: \`pm2 logs omada-voucher\`
- Check system service: \`sudo systemctl status omada-voucher\`
- Check Nginx status: \`sudo systemctl status nginx\`
- View Nginx logs: \`sudo tail -f /var/log/nginx/access.log\`

## Troubleshooting
- Application logs: \`pm2 logs omada-voucher\`
- Database connection: \`mysql -u $DB_USER -p $DB_NAME\`
- Nginx configuration test: \`sudo nginx -t\`
- Firewall status: \`sudo ufw status\`

EOF

sudo chown $APP_USER:$APP_USER $APP_DIR/INSTALLATION_SUMMARY.md

print_header "Installation completed successfully!"
print_status "📋 Summary saved to: $APP_DIR/INSTALLATION_SUMMARY.md"
print_status "🔑 Database password saved in: $APP_DIR/.env.template"
print_warning "⚠️  Please complete the next steps in the summary file"
print_status "🚀 Application directory: $APP_DIR"
print_status "👤 Application user: $APP_USER"

echo ""
print_header "Next Steps:"
echo "1. Configure environment variables in $APP_DIR/.env"
echo "2. Update your domain in Nginx configuration"
echo "3. Deploy the application using $APP_DIR/deploy.sh"
echo "4. Setup SSL certificate with certbot"
echo "5. Start the services"

echo ""
print_status "Installation script completed!"