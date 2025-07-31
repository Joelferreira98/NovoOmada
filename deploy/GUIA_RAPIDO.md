# 🚀 Guia Rápido de Instalação - Sistema Vouchers Omada

## ⚡ Instalação em 5 Minutos

### Opção 1: Script Automático (Recomendado)
```bash
# Baixar e executar script
curl -fsSL https://raw.githubusercontent.com/seu-usuario/omada-voucher/main/deploy/install.sh | bash

# Configurar credenciais Omada
sudo -u omada-voucher nano /opt/omada-voucher/.env

# Fazer deploy
sudo -u omada-voucher /opt/omada-voucher/deploy.sh
```

### Opção 2: Docker (Mais Simples)
```bash
# Instalar Docker + Sistema
curl -fsSL https://raw.githubusercontent.com/seu-usuario/omada-voucher/main/deploy/docker-install.sh | bash

# Configurar e iniciar
cd ~/omada-voucher
nano .env
./start.sh
```

---

## 📝 Configuração Essencial

### 1. Credenciais Omada (.env)
```bash
OMADA_URL=https://192.168.1.10:8043
OMADA_CLIENT_ID=abc123def456
OMADA_CLIENT_SECRET=sua_chave_secreta
OMADA_OMADAC_ID=def789ghi012
```

### 2. Acesso Inicial
- **URL**: http://seu-servidor:3000
- **Login**: admin / admin123

### 3. Comandos Básicos

**Instalação Tradicional:**
```bash
# Status
pm2 status
sudo systemctl status nginx mysql

# Logs
pm2 logs omada-voucher
sudo tail -f /var/log/nginx/access.log

# Restart
pm2 restart omada-voucher
sudo systemctl restart nginx

# Backup
/usr/local/bin/omada-voucher-backup
```

**Docker:**
```bash
# Status
./status.sh

# Logs
./logs.sh

# Restart
./stop.sh && ./start.sh

# Backup
./backup.sh
```

---

## 🔧 Solução Rápida de Problemas

| Problema | Solução |
|----------|---------|
| App não inicia | `pm2 restart omada-voucher` |
| Erro 502 Nginx | Verificar se app está na porta 3000 |
| Erro banco dados | `sudo systemctl restart mysql` |
| SSL expirado | `sudo certbot renew` |
| Sem conexão Omada | Verificar IP e credenciais no .env |

---

## 📞 Checklist de Instalação

- [ ] Sistema atualizado
- [ ] Node.js 20 instalado
- [ ] MySQL configurado
- [ ] Nginx funcionando
- [ ] Firewall configurado
- [ ] SSL habilitado (produção)
- [ ] Credenciais Omada configuradas
- [ ] Backup automático funcionando
- [ ] Acesso à aplicação OK
- [ ] Login inicial realizado

---

**Precisa de ajuda?** Consulte o [Manual Completo](MANUAL_INSTALLATION.md)