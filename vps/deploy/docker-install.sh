#!/bin/bash

# Docker-based installation script for Omada Voucher System
set -e

echo "🐳 Starting Docker-based Omada Voucher System Installation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if Docker is installed
print_header "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_warning "Please log out and log back in for Docker permissions to take effect."
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create application directory
APP_DIR="$HOME/omada-voucher"
print_header "Creating application directory: $APP_DIR"
mkdir -p $APP_DIR
cd $APP_DIR

# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32)
DB_ROOT_PASSWORD=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 64)
REDIS_PASSWORD=$(openssl rand -base64 32)

# Create environment file
print_header "Creating environment configuration..."
cat > .env << EOF
# Database Configuration
DB_PASSWORD=$DB_PASSWORD
DB_ROOT_PASSWORD=$DB_ROOT_PASSWORD

# Redis Configuration
REDIS_PASSWORD=$REDIS_PASSWORD

# Application Configuration
NODE_ENV=production
SESSION_SECRET=$SESSION_SECRET

# Omada Controller Configuration (to be filled by user)
OMADA_URL=https://your-omada-controller.com:8043
OMADA_CLIENT_ID=your_client_id
OMADA_CLIENT_SECRET=your_client_secret
OMADA_OMADAC_ID=your_omadac_id
EOF

# Copy deployment files
print_header "Setting up deployment files..."
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please ensure the deployment files are in the current directory"
    print_status "Required files: docker-compose.yml, Dockerfile, deploy/"
    exit 1
fi

# Create SSL directory
mkdir -p deploy/ssl

# Create data directories
mkdir -p data/mysql data/redis logs

# Set proper permissions
chmod 600 .env
chmod -R 755 data logs

# Create management scripts
print_header "Creating management scripts..."

# Start script
cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Omada Voucher System..."
docker-compose up -d
echo "✅ System started. Check status with: ./status.sh"
EOF

# Stop script
cat > stop.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping Omada Voucher System..."
docker-compose down
echo "✅ System stopped."
EOF

# Status script
cat > status.sh << 'EOF'
#!/bin/bash
echo "📊 Omada Voucher System Status:"
echo "================================"
docker-compose ps
echo ""
echo "📈 Resource Usage:"
echo "=================="
docker stats --no-stream
EOF

# Update script
cat > update.sh << 'EOF'
#!/bin/bash
echo "🔄 Updating Omada Voucher System..."
docker-compose down
docker-compose pull
docker-compose build --no-cache
docker-compose up -d
echo "✅ System updated and restarted."
EOF

# Backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "💾 Creating backup..."

# Database backup
docker-compose exec -T db mysqldump -u root -p$DB_ROOT_PASSWORD omada_voucher > $BACKUP_DIR/database_$DATE.sql

# Application data backup
tar -czf $BACKUP_DIR/app_data_$DATE.tar.gz data/ logs/ .env

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "✅ Backup completed: $BACKUP_DIR/database_$DATE.sql"
EOF

# Restore script
cat > restore.sh << 'EOF'
#!/bin/bash
if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file.sql>"
    echo "Available backups:"
    ls -la backups/*.sql 2>/dev/null || echo "No backups found"
    exit 1
fi

echo "🔄 Restoring database from $1..."
docker-compose exec -T db mysql -u root -p$DB_ROOT_PASSWORD omada_voucher < $1
echo "✅ Database restored successfully."
EOF

# Logs script
cat > logs.sh << 'EOF'
#!/bin/bash
if [ -z "$1" ]; then
    echo "📋 All services logs:"
    docker-compose logs -f
else
    echo "📋 Logs for service: $1"
    docker-compose logs -f $1
fi
EOF

# Make scripts executable
chmod +x *.sh

# Create systemd service for auto-start
print_header "Creating systemd service..."
cat > omada-voucher.service << EOF
[Unit]
Description=Omada Voucher System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo mv omada-voucher.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable omada-voucher

# Setup log rotation
print_header "Setting up log rotation..."
cat > omada-voucher-logrotate << 'EOF'
/home/*/omada-voucher/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

sudo mv omada-voucher-logrotate /etc/logrotate.d/omada-voucher

# Create installation summary
print_header "Creating installation summary..."
cat > DOCKER_INSTALLATION_SUMMARY.md << EOF
# Omada Voucher System - Docker Installation Summary

## Installation completed on: $(date)

### Generated Passwords
- Database Password: $DB_PASSWORD
- Database Root Password: $DB_ROOT_PASSWORD
- Redis Password: $REDIS_PASSWORD
- Session Secret: (64 characters, in .env file)

### Directory Structure
\`\`\`
$APP_DIR/
├── docker-compose.yml       # Docker services configuration
├── Dockerfile              # Application container
├── .env                    # Environment variables
├── deploy/                 # Deployment configurations
├── data/                   # Persistent data
├── logs/                   # Application logs
├── backups/                # Database backups
└── *.sh                    # Management scripts
\`\`\`

### Management Scripts
- \`./start.sh\`    - Start all services
- \`./stop.sh\`     - Stop all services
- \`./status.sh\`   - Check system status
- \`./update.sh\`   - Update and restart system
- \`./backup.sh\`   - Create database backup
- \`./restore.sh\`  - Restore from backup
- \`./logs.sh\`     - View application logs

### Services
- **Application**: http://localhost:3000
- **Database**: MySQL 8.0 (internal)
- **Cache**: Redis (internal)
- **Web Server**: Nginx (port 80/443)

## Next Steps

### 1. Configure Omada Credentials
\`\`\`bash
nano .env
# Update OMADA_* variables with your controller details
\`\`\`

### 2. Start the System
\`\`\`bash
./start.sh
\`\`\`

### 3. Check System Status
\`\`\`bash
./status.sh
\`\`\`

### 4. Access the Application
Open your browser and go to: http://your-server-ip:3000

Default login:
- Username: admin
- Password: admin123

### 5. Setup SSL (Optional)
For production use, configure SSL certificates:
\`\`\`bash
# Place your SSL certificates in deploy/ssl/
# - fullchain.pem
# - privkey.pem
# Then uncomment SSL section in deploy/nginx.conf
\`\`\`

## Monitoring and Maintenance

### View Logs
\`\`\`bash
./logs.sh                  # All services
./logs.sh app             # Application only
./logs.sh db              # Database only
./logs.sh nginx           # Nginx only
\`\`\`

### Create Backup
\`\`\`bash
./backup.sh
\`\`\`

### Restore Backup
\`\`\`bash
./restore.sh backups/database_20240101_120000.sql
\`\`\`

### Update System
\`\`\`bash
./update.sh
\`\`\`

## Troubleshooting

### Check Container Status
\`\`\`bash
docker-compose ps
docker-compose logs [service_name]
\`\`\`

### Restart Specific Service
\`\`\`bash
docker-compose restart app
docker-compose restart db
docker-compose restart nginx
\`\`\`

### Database Access
\`\`\`bash
docker-compose exec db mysql -u root -p omada_voucher
\`\`\`

### Application Shell Access
\`\`\`bash
docker-compose exec app sh
\`\`\`

## Security Notes

- All passwords are randomly generated and stored in .env file
- Application runs as non-root user inside containers
- Database is only accessible from within the Docker network
- SSL should be configured for production use
- Regular backups are recommended

## Support

For issues and support:
1. Check logs: \`./logs.sh\`
2. Check status: \`./status.sh\`
3. Review this documentation
4. Check Docker and Docker Compose documentation

EOF

print_header "Installation completed successfully!"
print_status "📋 Summary saved to: DOCKER_INSTALLATION_SUMMARY.md"
print_status "🔑 Generated passwords saved in: .env"
print_status "🚀 Application directory: $APP_DIR"

echo ""
print_header "Quick Start:"
echo "1. Edit .env file with your Omada controller details"
echo "2. Run: ./start.sh"
echo "3. Access: http://your-server-ip:3000"
echo "4. Login with: admin / admin123"

echo ""
print_status "Docker installation completed!"