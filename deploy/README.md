# Omada Voucher System - Deployment Guide

Este guia fornece instruções completas para instalação do Sistema de Vouchers Omada em seu servidor pessoal.

## 📚 Documentação Disponível

- **[Guia Rápido](GUIA_RAPIDO.md)** - Instalação em 5 minutos
- **[Manual Completo](MANUAL_INSTALLATION.md)** - Instalação passo a passo detalhada
- **[Solução de Problemas](TROUBLESHOOTING.md)** - Diagnóstico e correção de erros
- **[README Principal](README.md)** - Visão geral e opções de instalação

## 📋 Opções de Instalação

### Opção 1: Instalação Tradicional (Recomendada para Produção)
- Instalação direta no sistema operacional
- Melhor performance
- Controle total sobre os serviços
- **Script**: `install.sh`

### Opção 2: Instalação com Docker (Recomendada para Desenvolvimento)
- Containerização completa
- Fácil de gerenciar e atualizar
- Isolamento de dependências
- **Script**: `docker-install.sh`

## 🚀 Instalação Tradicional

### Pré-requisitos
- Ubuntu 20.04+ ou Debian 11+
- Usuário com privilégios sudo (não root)
- Acesso à internet
- Pelo menos 2GB RAM e 10GB de espaço livre

### Passo a Passo

1. **Baixar os arquivos de instalação**
   ```bash
   wget https://github.com/seu-usuario/omada-voucher/archive/deploy.zip
   unzip deploy.zip
   cd omada-voucher-deploy/deploy
   ```

2. **Executar o script de instalação**
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

3. **Configurar as variáveis de ambiente**
   ```bash
   sudo -u omada-voucher cp /opt/omada-voucher/.env.template /opt/omada-voucher/.env
   sudo -u omada-voucher nano /opt/omada-voucher/.env
   ```

4. **Atualizar o domínio no Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/omada-voucher
   # Substituir 'your-domain.com' pelo seu domínio real
   sudo nginx -t && sudo systemctl reload nginx
   ```

5. **Fazer o deploy da aplicação**
   ```bash
   sudo -u omada-voucher /opt/omada-voucher/deploy.sh
   ```

6. **Configurar SSL (opcional mas recomendado)**
   ```bash
   sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
   ```

7. **Iniciar os serviços**
   ```bash
   sudo systemctl start omada-voucher
   sudo systemctl start nginx
   ```

## 🐳 Instalação com Docker

### Pré-requisitos
- Ubuntu 20.04+ ou Debian 11+
- Usuário com privilégios sudo (não root)
- Acesso à internet

### Passo a Passo

1. **Baixar os arquivos de instalação**
   ```bash
   git clone https://github.com/seu-usuario/omada-voucher.git
   cd omada-voucher/deploy
   ```

2. **Executar o script de instalação Docker**
   ```bash
   chmod +x docker-install.sh
   ./docker-install.sh
   ```

3. **Configurar as credenciais do Omada**
   ```bash
   nano .env
   # Atualizar as variáveis OMADA_*
   ```

4. **Iniciar o sistema**
   ```bash
   ./start.sh
   ```

## 🔧 Configuração do Controlador Omada

### Obter as Credenciais da API

1. **Acessar o Controlador Omada**
   - Faça login no seu controlador Omada
   - Vá para Configurações > Integração de API

2. **Criar um Cliente API**
   - Clique em "Adicionar Cliente"
   - Nome: "Sistema de Vouchers"
   - Tipo: "Client Credentials"
   - Salve as credenciais geradas

3. **Configurar no Sistema**
   ```bash
   OMADA_URL=https://seu-controlador.com:8043
   OMADA_CLIENT_ID=seu_client_id
   OMADA_CLIENT_SECRET=seu_client_secret
   OMADA_OMADAC_ID=seu_omadac_id
   ```

## 📊 Monitoramento e Manutenção

### Comandos de Monitoramento

**Instalação Tradicional:**
```bash
# Status dos serviços
sudo systemctl status omada-voucher
sudo systemctl status nginx
sudo systemctl status mysql

# Logs da aplicação
pm2 logs omada-voucher
sudo tail -f /var/log/nginx/access.log

# Status do PM2
pm2 status
pm2 monit
```

**Instalação Docker:**
```bash
# Status dos containers
./status.sh

# Logs da aplicação
./logs.sh
./logs.sh app    # Apenas aplicação
./logs.sh db     # Apenas banco de dados

# Recursos do sistema
docker stats
```

### Backup e Restauração

**Instalação Tradicional:**
```bash
# Criar backup
/usr/local/bin/omada-voucher-backup

# Localização dos backups
ls -la /var/backups/omada-voucher/
```

**Instalação Docker:**
```bash
# Criar backup
./backup.sh

# Restaurar backup
./restore.sh backups/database_20240101_120000.sql
```

### Atualizações

**Instalação Tradicional:**
```bash
# Atualizar aplicação
sudo -u omada-voucher /opt/omada-voucher/deploy.sh

# Atualizar sistema
sudo apt update && sudo apt upgrade
```

**Instalação Docker:**
```bash
# Atualizar tudo
./update.sh
```

## 🔒 Segurança

### Configurações de Firewall
```bash
# Portas necessárias
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### SSL/TLS
```bash
# Instalar certificado Let's Encrypt
sudo certbot --nginx -d seu-dominio.com

# Renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Hardening
- Sempre usar HTTPS em produção
- Configurar senhas fortes
- Manter o sistema atualizado
- Fazer backups regulares
- Monitorar logs de acesso

## 🚨 Solução de Problemas

### Problemas Comuns

**1. Erro de Conectividade com Omada**
```bash
# Verificar se o controlador está acessível
curl -k https://seu-controlador.com:8043/api/info

# Verificar credenciais no .env
cat /opt/omada-voucher/.env | grep OMADA
```

**2. Problemas de Banco de Dados**
```bash
# Verificar status do MySQL
sudo systemctl status mysql

# Testar conexão
mysql -u omada_user -p omada_voucher
```

**3. Aplicação não inicia**
```bash
# Verificar logs
pm2 logs omada-voucher

# Reiniciar aplicação
pm2 restart omada-voucher
```

**4. Problemas com Nginx**
```bash
# Testar configuração
sudo nginx -t

# Verificar logs
sudo tail -f /var/log/nginx/error.log
```

### Logs Importantes

**Localizações dos Logs:**
- Aplicação: `pm2 logs` ou `./logs.sh`
- Nginx: `/var/log/nginx/`
- MySQL: `/var/log/mysql/`
- Sistema: `journalctl -u omada-voucher`

## 📞 Suporte

Para problemas técnicos:
1. Verificar os logs relevantes
2. Consultar a seção de solução de problemas
3. Verificar as configurações do .env
4. Testar conectividade com o controlador Omada

## 📈 Otimização de Performance

### Para Produção
- Configure pelo menos 4GB de RAM
- Use SSD para armazenamento
- Configure cache Redis
- Otimize as consultas do banco de dados
- Configure CDN para assets estáticos

### Monitoramento Avançado
- Configure alertas de sistema
- Use ferramentas como htop, iotop
- Monitore uso de CPU, RAM e disco
- Configure logs de auditoria

---

**Versão:** 1.0  
**Última Atualização:** $(date)  
**Suporte:** Sistema de Vouchers Omada