# Manual de Instalação - Sistema de Vouchers Omada

## 📋 Índice
1. [Instalação Manual Completa](#instalação-manual-completa)
2. [Instalação via Script Automatizado](#instalação-via-script-automatizado)
3. [Instalação Docker](#instalação-docker)
4. [Configuração Pós-Instalação](#configuração-pós-instalação)
5. [Solução de Problemas](#solução-de-problemas)

---

# 1. Instalação Manual Completa

## 🔧 Pré-requisitos

### Sistema Operacional
- Ubuntu 20.04 LTS ou superior
- Debian 11 ou superior
- CentOS 8+ / RHEL 8+ (com adaptações)

### Recursos Mínimos
- **RAM**: 2GB (recomendado 4GB)
- **Armazenamento**: 10GB livres
- **CPU**: 2 cores
- **Rede**: Conexão com internet estável

### Usuário e Permissões
```bash
# Criar usuário não-root com sudo
sudo adduser omada-admin
sudo usermod -aG sudo omada-admin
su - omada-admin
```

## 🚀 Passo 1: Atualização do Sistema

```bash
# Atualizar repositórios e pacotes
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip \
    htop \
    nano \
    ufw
```

## 🔥 Passo 2: Instalação do Node.js 20

```bash
# Adicionar repositório oficial Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js
sudo apt-get install -y nodejs

# Verificar instalação
node --version  # deve mostrar v20.x.x
npm --version   # deve mostrar 10.x.x

# Instalar PM2 globalmente
sudo npm install -g pm2
```

## 🗄️ Passo 3: Instalação e Configuração do MySQL

```bash
# Instalar MySQL Server
sudo apt install -y mysql-server

# Executar configuração segura
sudo mysql_secure_installation
```

**Configurações recomendadas durante mysql_secure_installation:**
- Validação de senha: Y (sim)
- Nível de política: 2 (STRONG)
- Remover usuários anônimos: Y
- Desabilitar login root remoto: Y
- Remover banco test: Y
- Recarregar privilégios: Y

```bash
# Conectar ao MySQL como root
sudo mysql

# Criar banco de dados e usuário
CREATE DATABASE omada_voucher CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'omada_user'@'localhost' IDENTIFIED BY 'SuaSenhaSegura123!';
GRANT ALL PRIVILEGES ON omada_voucher.* TO 'omada_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Testar conexão
mysql -u omada_user -p omada_voucher
```

## 🌐 Passo 4: Instalação e Configuração do Nginx

```bash
# Instalar Nginx
sudo apt install -y nginx

# Iniciar e habilitar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar status
sudo systemctl status nginx
```

### Configurar Nginx para a aplicação:

```bash
# Criar arquivo de configuração
sudo nano /etc/nginx/sites-available/omada-voucher
```

**Conteúdo do arquivo:**
```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        image/svg+xml;

    # Main proxy configuration
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
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
    }
}
```

```bash
# Ativar o site
sudo ln -sf /etc/nginx/sites-available/omada-voucher /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

## 🔐 Passo 5: Configuração do Firewall

```bash
# Configurar UFW
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000

# Verificar status
sudo ufw status verbose
```

## 📁 Passo 6: Preparação da Aplicação

```bash
# Criar diretório da aplicação
sudo mkdir -p /opt/omada-voucher
sudo chown $USER:$USER /opt/omada-voucher
cd /opt/omada-voucher

# Baixar código fonte (substitua pela URL do seu repositório)
git clone https://github.com/seu-usuario/omada-voucher-system.git .

# Ou fazer upload manual dos arquivos se não usar Git
```

### Instalar dependências:

```bash
# Instalar dependências do projeto
npm ci --production

# Construir a aplicação
npm run build
```

## ⚙️ Passo 7: Configuração de Ambiente

```bash
# Criar arquivo de ambiente
cp .env.example .env
nano .env
```

**Configurar o arquivo .env:**
```bash
# Database Configuration
DATABASE_URL=mysql://omada_user:SuaSenhaSegura123!@localhost:3306/omada_voucher
DB_HOST=localhost
DB_PORT=3306
DB_NAME=omada_voucher
DB_USER=omada_user
DB_PASSWORD=SuaSenhaSegura123!

# Application Configuration
NODE_ENV=production
PORT=3000
SESSION_SECRET=sua_chave_secreta_muito_longa_e_segura_aqui

# Omada Controller Configuration
OMADA_URL=https://seu-controlador-omada.com:8043
OMADA_CLIENT_ID=seu_client_id
OMADA_CLIENT_SECRET=seu_client_secret
OMADA_OMADAC_ID=seu_omadac_id
```

## 📊 Passo 8: Inicialização do Banco de Dados

```bash
# Executar migrações
npm run db:push

# Verificar se as tabelas foram criadas
mysql -u omada_user -p omada_voucher -e "SHOW TABLES;"
```

## 🚀 Passo 9: Configuração do PM2

```bash
# Criar arquivo de configuração do PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'omada-voucher',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
EOF

# Criar diretório de logs
mkdir -p logs

# Iniciar aplicação
pm2 start ecosystem.config.js

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
# Executar o comando que aparecer na saída
```

## 🔒 Passo 10: Configuração SSL (Opcional mas Recomendado)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Testar renovação automática
sudo certbot renew --dry-run

# Configurar renovação automática no crontab
sudo crontab -e
# Adicionar linha: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📋 Passo 11: Verificação Final

```bash
# Verificar status dos serviços
sudo systemctl status nginx
sudo systemctl status mysql
pm2 status

# Testar conectividade
curl -I http://localhost:3000
curl -I http://seu-dominio.com

# Verificar logs
pm2 logs omada-voucher
```

---

# 2. Instalação via Script Automatizado

## 🎯 Instalação Tradicional (Recomendada para Produção)

### Download e Execução:

```bash
# Baixar scripts
wget https://raw.githubusercontent.com/seu-usuario/omada-voucher/main/deploy/install.sh
chmod +x install.sh

# Executar instalação
./install.sh
```

### O que o script faz automaticamente:

1. ✅ Atualiza o sistema operacional
2. ✅ Instala Node.js 20 e PM2
3. ✅ Configura MySQL com banco e usuário
4. ✅ Instala e configura Nginx
5. ✅ Configura firewall UFW
6. ✅ Cria usuário da aplicação
7. ✅ Configura SSL (Certbot)
8. ✅ Cria scripts de backup
9. ✅ Configura rotação de logs
10. ✅ Cria serviço systemd

### Após a execução do script:

```bash
# 1. Configurar variáveis de ambiente
sudo -u omada-voucher cp /opt/omada-voucher/.env.template /opt/omada-voucher/.env
sudo -u omada-voucher nano /opt/omada-voucher/.env

# 2. Atualizar domínio no Nginx
sudo nano /etc/nginx/sites-available/omada-voucher
sudo nginx -t && sudo systemctl reload nginx

# 3. Fazer deploy da aplicação
sudo -u omada-voucher /opt/omada-voucher/deploy.sh

# 4. Configurar SSL
sudo certbot --nginx -d seu-dominio.com

# 5. Iniciar serviços
sudo systemctl start omada-voucher
```

## 🎯 Instalação Rápida (One-liner)

```bash
curl -fsSL https://raw.githubusercontent.com/seu-usuario/omada-voucher/main/deploy/quick-start.sh | bash
```

---

# 3. Instalação Docker

## 🐳 Pré-requisitos Docker

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout e login novamente
```

## 🚀 Instalação Docker via Script

```bash
# Baixar e executar
wget https://raw.githubusercontent.com/seu-usuario/omada-voucher/main/deploy/docker-install.sh
chmod +x docker-install.sh
./docker-install.sh
```

## 🛠️ Instalação Docker Manual

```bash
# Criar diretório
mkdir ~/omada-voucher && cd ~/omada-voucher

# Baixar arquivos Docker
wget https://raw.githubusercontent.com/seu-usuario/omada-voucher/main/deploy/docker-compose.yml
wget https://raw.githubusercontent.com/seu-usuario/omada-voucher/main/deploy/Dockerfile
wget https://raw.githubusercontent.com/seu-usuario/omada-voucher/main/deploy/.env.example

# Configurar ambiente
cp .env.example .env
nano .env
```

**Configurar .env para Docker:**
```bash
# Gerar senhas seguras
DB_PASSWORD=$(openssl rand -base64 32)
DB_ROOT_PASSWORD=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 64)
REDIS_PASSWORD=$(openssl rand -base64 32)

# Omada Configuration
OMADA_URL=https://seu-controlador.com:8043
OMADA_CLIENT_ID=seu_client_id
OMADA_CLIENT_SECRET=seu_client_secret
OMADA_OMADAC_ID=seu_omadac_id
```

```bash
# Iniciar containers
docker-compose up -d

# Verificar status
docker-compose ps
```

### Scripts de Gerenciamento Docker:

```bash
# Criar scripts úteis
cat > start.sh << 'EOF'
#!/bin/bash
docker-compose up -d
EOF

cat > stop.sh << 'EOF'
#!/bin/bash
docker-compose down
EOF

cat > logs.sh << 'EOF'
#!/bin/bash
docker-compose logs -f ${1:-}
EOF

cat > backup.sh << 'EOF'
#!/bin/bash
mkdir -p backups
docker-compose exec -T db mysqldump -u root -p$DB_ROOT_PASSWORD omada_voucher > backups/backup_$(date +%Y%m%d_%H%M%S).sql
EOF

chmod +x *.sh
```

---

# 4. Configuração Pós-Instalação

## 🔧 Configuração do Controlador Omada

### Obter Credenciais da API:

1. **Acessar Controlador Omada**
   - URL: `https://seu-controlador.com:8043`
   - Login: admin/senha

2. **Navegar para API Settings**
   - Settings → Integration → Open API

3. **Criar Client API**
   - Name: "Sistema Vouchers"
   - Type: "Client Credentials"
   - Save credentials

4. **Configurar no Sistema**
   ```bash
   # Editar .env
   OMADA_URL=https://192.168.1.10:8043
   OMADA_CLIENT_ID=abc123def456
   OMADA_CLIENT_SECRET=sua_chave_secreta
   OMADA_OMADAC_ID=def789ghi012
   ```

## 👥 Primeiro Acesso

### Login Padrão:
- **URL**: `http://seu-dominio.com` ou `http://ip-servidor:3000`
- **Usuário**: `admin`
- **Senha**: `admin123`

### Primeiros Passos:

1. **Alterar senha do admin**
2. **Configurar credenciais Omada**
3. **Sincronizar sites**
4. **Criar usuários admin/vendedor**
5. **Configurar planos de voucher**

## 🔐 Segurança Recomendada

```bash
# Alterar senhas padrão
# Configurar SSL/HTTPS
# Atualizar sistema regularmente
sudo apt update && sudo apt upgrade

# Configurar fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban

# Monitorar logs
tail -f /var/log/nginx/access.log
pm2 logs omada-voucher
```

---

# 5. Solução de Problemas

## 🚨 Problemas Comuns

### Aplicação não inicia:
```bash
# Verificar logs
pm2 logs omada-voucher

# Verificar portas
sudo netstat -tlnp | grep :3000

# Reiniciar aplicação
pm2 restart omada-voucher
```

### Erro de conexão com banco:
```bash
# Testar conexão MySQL
mysql -u omada_user -p omada_voucher

# Verificar status MySQL
sudo systemctl status mysql

# Reiniciar MySQL
sudo systemctl restart mysql
```

### Erro SSL/HTTPS:
```bash
# Verificar certificados
sudo certbot certificates

# Renovar certificado
sudo certbot renew

# Testar Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Problemas de conectividade Omada:
```bash
# Testar conectividade
curl -k https://seu-controlador.com:8043/api/info

# Verificar credenciais
cat /opt/omada-voucher/.env | grep OMADA

# Verificar logs da aplicação
pm2 logs omada-voucher | grep -i omada
```

## 📊 Monitoramento

### Comandos Úteis:
```bash
# Status geral
pm2 status
sudo systemctl status nginx mysql

# Uso de recursos
htop
df -h
free -h

# Logs em tempo real
pm2 logs omada-voucher --lines 50
sudo tail -f /var/log/nginx/access.log

# Backup manual
/usr/local/bin/omada-voucher-backup
```

### Arquivo de Status Sistemático:
```bash
# Criar script de status
cat > /usr/local/bin/omada-status << 'EOF'
#!/bin/bash
echo "=== Sistema Omada Voucher - Status ==="
echo "Data: $(date)"
echo ""
echo "🖥️ Sistema:"
uptime
echo ""
echo "💾 Espaço em disco:"
df -h /
echo ""
echo "🔧 Serviços:"
systemctl is-active nginx mysql
pm2 list
echo ""
echo "🌐 Conectividade:"
curl -s -o /dev/null -w "Nginx: %{http_code}\n" http://localhost
curl -s -o /dev/null -w "App: %{http_code}\n" http://localhost:3000
EOF

chmod +x /usr/local/bin/omada-status
```

---

## 📞 Suporte Técnico

### Informações para Coleta:
```bash
# Gerar relatório completo
cat > /tmp/debug-report.txt << EOF
=== RELATÓRIO DE DEBUG - $(date) ===

Sistema:
$(lsb_release -a)
$(uname -a)

Serviços:
$(systemctl status nginx --no-pager)
$(systemctl status mysql --no-pager)
$(pm2 list)

Recursos:
$(free -h)
$(df -h)

Configuração:
$(cat /opt/omada-voucher/.env | grep -v PASSWORD | grep -v SECRET)

Logs recentes:
$(pm2 logs omada-voucher --lines 20)
EOF

echo "Relatório salvo em: /tmp/debug-report.txt"
```

### Contatos e Recursos:
- **Documentação**: Este manual
- **Logs**: `/opt/omada-voucher/logs/`
- **Configuração**: `/opt/omada-voucher/.env`
- **Backup**: `/var/backups/omada-voucher/`

---

**Manual v1.0 - Atualizado em $(date)**