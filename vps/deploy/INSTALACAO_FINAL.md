# 🚀 Instalação Final - Sistema de Vouchers Omada

## 📦 Repositório Oficial
**GitHub**: https://github.com/Joelferreira98/NovoOmada

---

## ⚡ Instalação Ultra-Rápida (Recomendada)

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

## 📋 Download Manual

```bash
# Baixar repositório completo
git clone https://github.com/Joelferreira98/NovoOmada.git
cd NovoOmada/deploy

# Executar instalação
chmod +x install.sh
./install.sh
```

---

## 🔧 Configuração Pós-Instalação

### 1. Configurar Credenciais Omada
```bash
# Instalação Tradicional
sudo -u omada-voucher nano /opt/omada-voucher/.env

# Docker
cd ~/omada-voucher
nano .env
```

### 2. Configuração .env
```bash
OMADA_URL=https://192.168.1.10:8043
OMADA_CLIENT_ID=seu_client_id
OMADA_CLIENT_SECRET=seu_client_secret
OMADA_OMADAC_ID=seu_omadac_id
```

### 3. Iniciar Sistema
```bash
# Instalação Tradicional
sudo -u omada-voucher /opt/omada-voucher/deploy.sh

# Docker
./start.sh
```

### 4. Acessar Aplicação
- **URL**: http://seu-servidor:3000
- **Login**: admin
- **Senha**: admin123

---

## 📚 Documentação Completa

### Manuais Disponíveis
- **[Instalação Manual Detalhada](MANUAL_INSTALLATION.md)**
- **[Guia Rápido](GUIA_RAPIDO.md)**
- **[Lista de Comandos](COMANDOS_RAPIDOS.md)**
- **[Solução de Problemas](TROUBLESHOOTING.md)**

### Links Diretos GitHub
- [Script Instalação Tradicional](https://raw.githubusercontent.com/Joelferreira98/NovoOmada/main/deploy/install.sh)
- [Script Docker](https://raw.githubusercontent.com/Joelferreira98/NovoOmada/main/deploy/docker-install.sh)
- [Docker Compose](https://raw.githubusercontent.com/Joelferreira98/NovoOmada/main/deploy/docker-compose.yml)
- [Configuração Nginx](https://raw.githubusercontent.com/Joelferreira98/NovoOmada/main/deploy/nginx.conf)

---

## 🛠️ Comandos Essenciais

### Status do Sistema
```bash
# Tradicional
pm2 status
sudo systemctl status nginx mysql

# Docker
./status.sh
```

### Logs em Tempo Real
```bash
# Tradicional
pm2 logs omada-voucher

# Docker
./logs.sh
```

### Backup
```bash
# Tradicional
/usr/local/bin/omada-voucher-backup

# Docker
./backup.sh
```

### Restart Completo
```bash
# Tradicional
pm2 restart omada-voucher
sudo systemctl restart nginx

# Docker
./stop.sh && ./start.sh
```

---

## 🔒 Checklist de Segurança

- [ ] SSL/HTTPS configurado (certbot)
- [ ] Firewall ativo (ufw)
- [ ] Senha padrão alterada
- [ ] Backup automático funcionando
- [ ] Credenciais Omada validadas
- [ ] Logs sendo rotacionados
- [ ] Sistema atualizado

---

## 📞 Suporte Rápido

### Problemas Comuns
| Problema | Comando |
|----------|---------|
| App offline | `pm2 restart omada-voucher` |
| Nginx erro | `sudo systemctl restart nginx` |
| DB erro | `sudo systemctl restart mysql` |
| SSL expirado | `sudo certbot renew` |

### Diagnóstico Completo
```bash
# Gerar relatório de sistema
curl -sL https://raw.githubusercontent.com/Joelferreira98/NovoOmada/main/deploy/diagnostics.sh | bash
```

---

## 🎯 Resumo Final

1. **Clone o repositório**: `git clone https://github.com/Joelferreira98/NovoOmada.git`
2. **Execute instalação**: `cd NovoOmada/deploy && ./install.sh`
3. **Configure Omada**: Edite .env com credenciais
4. **Faça deploy**: Execute script de deploy
5. **Acesse sistema**: http://servidor:3000
6. **Login inicial**: admin/admin123

**✅ Sistema pronto para produção!**

---

**Repositório**: https://github.com/Joelferreira98/NovoOmada  
**Documentação**: [deploy/README.md](README.md)  
**Atualizado**: $(date)