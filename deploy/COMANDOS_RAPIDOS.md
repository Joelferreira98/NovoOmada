# ⚡ Comandos Rápidos - Sistema Vouchers Omada

## 🚀 Instalação

### Opção 1: Script Automático
```bash
curl -fsSL https://raw.githubusercontent.com/Joelferreira98/NovoOmada/main/deploy/install.sh | bash
```

### Opção 2: Docker
```bash
curl -fsSL https://raw.githubusercontent.com/Joelferreira98/NovoOmada/main/deploy/docker-install.sh | bash
```

### Opção 3: Seleção Interativa
```bash
curl -fsSL https://raw.githubusercontent.com/Joelferreira98/NovoOmada/main/deploy/quick-start.sh | bash
```

---

## 🔧 Gerenciamento - Instalação Tradicional

### Status e Monitoramento
```bash
# Status geral
pm2 status
sudo systemctl status nginx mysql

# Logs em tempo real
pm2 logs omada-voucher
sudo tail -f /var/log/nginx/access.log

# Monitoramento de recursos
htop
pm2 monit
```

### Controle de Serviços
```bash
# Aplicação
pm2 start omada-voucher
pm2 stop omada-voucher
pm2 restart omada-voucher
pm2 reload omada-voucher

# Sistema
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx

sudo systemctl start mysql
sudo systemctl stop mysql
sudo systemctl restart mysql
```

### Configuração
```bash
# Editar variáveis ambiente
sudo -u omada-voucher nano /opt/omada-voucher/.env

# Recarregar após mudanças
pm2 restart omada-voucher

# Editar configuração Nginx
sudo nano /etc/nginx/sites-available/omada-voucher
sudo nginx -t && sudo systemctl reload nginx
```

### Backup e Restore
```bash
# Backup automático
/usr/local/bin/omada-voucher-backup

# Backup manual
mysqldump -u omada_user -p omada_voucher > backup.sql

# Restore
mysql -u omada_user -p omada_voucher < backup.sql
```

---

## 🐳 Gerenciamento - Docker

### Status e Monitoramento
```bash
# Status containers
./status.sh
docker-compose ps

# Logs
./logs.sh
./logs.sh app
./logs.sh db
./logs.sh nginx

# Recursos
docker stats
```

### Controle de Serviços
```bash
# Iniciar/Parar
./start.sh
./stop.sh

# Reiniciar
./stop.sh && ./start.sh

# Atualizar
./update.sh

# Rebuild completo
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Configuração
```bash
# Editar variáveis
nano .env

# Aplicar mudanças
docker-compose down
docker-compose up -d
```

### Backup e Restore
```bash
# Backup
./backup.sh

# Restore
./restore.sh backups/backup_20240101_120000.sql

# Backup manual
docker-compose exec -T db mysqldump -u root -p$DB_ROOT_PASSWORD omada_voucher > backup.sql
```

---

## 🔍 Diagnóstico Rápido

### Verificar Conectividade
```bash
# Aplicação local
curl -I http://localhost:3000

# Nginx
curl -I http://localhost

# Omada Controller
curl -k https://192.168.1.10:8043/api/info

# SSL
echo | openssl s_client -connect seu-dominio.com:443 | grep "Verify return code"
```

### Verificar Logs de Erro
```bash
# Aplicação
pm2 logs omada-voucher --err --lines 20

# Nginx
sudo tail -20 /var/log/nginx/error.log

# MySQL
sudo tail -20 /var/log/mysql/error.log

# Sistema
journalctl -u omada-voucher --lines 20
```

### Testar Banco de Dados
```bash
# Conexão
mysql -u omada_user -p omada_voucher

# Verificar tabelas
mysql -u omada_user -p omada_voucher -e "SHOW TABLES;"

# Verificar usuários
mysql -u omada_user -p omada_voucher -e "SELECT id, username, role FROM users LIMIT 5;"
```

---

## 🛡️ Segurança

### SSL/HTTPS
```bash
# Instalar certificado
sudo certbot --nginx -d seu-dominio.com

# Renovar certificado
sudo certbot renew

# Verificar certificados
sudo certbot certificates

# Testar renovação
sudo certbot renew --dry-run
```

### Firewall
```bash
# Status
sudo ufw status

# Permitir portas
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow ssh

# Habilitar
sudo ufw enable
```

### Atualizações
```bash
# Sistema
sudo apt update && sudo apt upgrade

# Node.js packages
cd /opt/omada-voucher
npm update

# Aplicação
sudo -u omada-voucher /opt/omada-voucher/deploy.sh
```

---

## 🚨 Solução de Problemas Express

### App não responde
```bash
pm2 restart omada-voucher
sudo systemctl restart nginx
```

### Erro 502 Bad Gateway
```bash
# Verificar se app está rodando
pm2 status
curl http://localhost:3000

# Reiniciar se necessário
pm2 restart omada-voucher
```

### Erro de banco de dados
```bash
sudo systemctl restart mysql
mysql -u omada_user -p omada_voucher
```

### SSL expirado
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Falta de espaço em disco
```bash
# Verificar espaço
df -h

# Limpar logs
pm2 flush
sudo logrotate -f /etc/logrotate.d/omada-voucher

# Limpar cache
sudo apt clean
docker system prune -f  # Se usando Docker
```

### Reset completo (emergência)
```bash
# Tradicional
pm2 delete omada-voucher
cd /opt/omada-voucher
npm run build
pm2 start dist/index.js --name omada-voucher

# Docker
docker-compose down -v
docker-compose up -d
```

---

## 📊 Comandos de Manutenção

### Limpeza Periódica
```bash
# Logs antigos
find /var/log -name "*.log" -mtime +30 -delete
pm2 flush

# Cache NPM
npm cache clean --force

# Docker (se aplicável)
docker system prune -f
docker volume prune -f
```

### Otimização MySQL
```bash
# Reparar tabelas
mysql -u omada_user -p omada_voucher -e "REPAIR TABLE users, sites, vouchers, sales;"

# Otimizar tabelas
mysql -u omada_user -p omada_voucher -e "OPTIMIZE TABLE users, sites, vouchers, sales;"

# Analisar performance
mysql -u root -p -e "SHOW PROCESSLIST;"
```

### Monitoramento Automático
```bash
# Script de auto-healing (criar cron job)
*/5 * * * * /usr/local/bin/omada-healing

# Backup automático diário
0 2 * * * /usr/local/bin/omada-voucher-backup

# Renovação SSL mensal
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🔗 URLs e Acessos

### URLs da Aplicação
- **Produção**: https://seu-dominio.com
- **Desenvolvimento**: http://localhost:3000
- **Status Health**: http://localhost:3000/api/health

### Credenciais Padrão
- **Login**: admin
- **Senha**: admin123
- **⚠️ Altere imediatamente após primeiro acesso**

### Arquivos Importantes
```bash
# Configuração principal
/opt/omada-voucher/.env

# Logs aplicação
/opt/omada-voucher/logs/

# Nginx config
/etc/nginx/sites-available/omada-voucher

# SSL certificates
/etc/letsencrypt/live/seu-dominio.com/

# Backups
/var/backups/omada-voucher/
```

---

**⚠️ Dica**: Salve este arquivo como favorito para acesso rápido aos comandos mais utilizados!

**📞 Suporte**: Consultar [Manual Completo](MANUAL_INSTALLATION.md) ou [Troubleshooting](TROUBLESHOOTING.md)