# 🔧 Guia de Solução de Problemas - Sistema Vouchers Omada

## 🚨 Problemas Mais Comuns

### 1. Aplicação Não Inicia

**Sintomas:**
- Erro 502 Bad Gateway
- PM2 mostra app offline
- Não consegue acessar port 3000

**Diagnóstico:**
```bash
# Verificar status PM2
pm2 status

# Ver logs de erro
pm2 logs omada-voucher --err

# Verificar porta
sudo netstat -tlnp | grep :3000
```

**Soluções:**
```bash
# Reiniciar aplicação
pm2 restart omada-voucher

# Se ainda não funcionar, verificar variáveis ambiente
cd /opt/omada-voucher
cat .env | grep -v PASSWORD

# Verificar se build existe
ls -la dist/

# Rebuildar se necessário
npm run build
pm2 restart omada-voucher
```

### 2. Erro de Conexão com Banco de Dados

**Sintomas:**
- "Connection refused" nos logs
- Erro ao fazer login
- Tabelas não encontradas

**Diagnóstico:**
```bash
# Verificar status MySQL
sudo systemctl status mysql

# Testar conexão
mysql -u omada_user -p omada_voucher

# Verificar logs MySQL
sudo tail -f /var/log/mysql/error.log
```

**Soluções:**
```bash
# Reiniciar MySQL
sudo systemctl restart mysql

# Verificar configurações no .env
grep DB_ /opt/omada-voucher/.env

# Recriar banco se necessário
mysql -u root -p
DROP DATABASE omada_voucher;
CREATE DATABASE omada_voucher CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Executar migrações
cd /opt/omada-voucher
npm run db:push
```

### 3. Problemas de SSL/HTTPS

**Sintomas:**
- Certificado expirado
- "Not secure" no navegador
- Erro SSL handshake

**Diagnóstico:**
```bash
# Verificar certificados
sudo certbot certificates

# Testar configuração Nginx
sudo nginx -t

# Verificar datas dos certificados
openssl x509 -in /etc/letsencrypt/live/seu-dominio.com/cert.pem -text -noout | grep "Not After"
```

**Soluções:**
```bash
# Renovar certificado
sudo certbot renew

# Forçar renovação
sudo certbot renew --force-renewal

# Recarregar Nginx
sudo systemctl reload nginx

# Se certificado não renova, recriar
sudo certbot delete --cert-name seu-dominio.com
sudo certbot --nginx -d seu-dominio.com
```

### 4. Erro de Conectividade com Omada

**Sintomas:**
- "Failed to connect to Omada controller"
- Token de acesso inválido
- Sites não sincronizam

**Diagnóstico:**
```bash
# Testar conectividade básica
curl -k https://192.168.1.10:8043/api/info

# Verificar credenciais
grep OMADA /opt/omada-voucher/.env

# Ver logs específicos
pm2 logs omada-voucher | grep -i omada
```

**Soluções:**
```bash
# Verificar credenciais no controlador Omada
# Settings > Integration > Open API

# Atualizar .env com credenciais corretas
nano /opt/omada-voucher/.env

# Reiniciar aplicação
pm2 restart omada-voucher

# Se problema persistir, verificar certificado do controlador
echo | openssl s_client -connect 192.168.1.10:8043 2>/dev/null | openssl x509 -noout -dates
```

### 5. Problemas de Performance

**Sintomas:**
- Aplicação lenta
- Timeouts frequentes
- Alta utilização de CPU/RAM

**Diagnóstico:**
```bash
# Verificar recursos
htop
free -h
df -h

# Ver estatísticas PM2
pm2 monit

# Analisar logs de performance
pm2 logs omada-voucher | grep -i "slow\|timeout\|error"
```

**Soluções:**
```bash
# Aumentar recursos PM2
pm2 delete omada-voucher
pm2 start dist/index.js --name omada-voucher --max-memory-restart 1G

# Otimizar MySQL
sudo mysql_secure_installation

# Limpar logs antigos
pm2 flush
sudo logrotate -f /etc/logrotate.d/omada-voucher

# Verificar conexões de rede
netstat -an | grep :3000 | wc -l
```

## 🐳 Problemas Específicos Docker

### Container não inicia

```bash
# Verificar logs do container
docker-compose logs app

# Verificar recursos
docker stats

# Reconstruir imagem
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Problemas de Rede Docker

```bash
# Verificar rede
docker network ls
docker network inspect omada-network

# Reiniciar networking
docker-compose down
docker system prune -f
docker-compose up -d
```

### Problemas de Volume Docker

```bash
# Verificar volumes
docker volume ls
docker volume inspect omada-voucher_db_data

# Backup antes de recriar
./backup.sh

# Recriar volumes se necessário
docker-compose down -v
docker-compose up -d
```

## 📊 Scripts de Diagnóstico

### Script Completo de Diagnóstico

```bash
#!/bin/bash
# Salvar como: /usr/local/bin/omada-diagnostics

echo "=== DIAGNÓSTICO SISTEMA OMADA VOUCHER ==="
echo "Data: $(date)"
echo ""

echo "🖥️ SISTEMA:"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Uptime: $(uptime -p)"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

echo "💾 RECURSOS:"
echo "RAM:"
free -h
echo ""
echo "Disco:"
df -h /
echo ""

echo "🔧 SERVIÇOS:"
echo "Nginx: $(systemctl is-active nginx)"
echo "MySQL: $(systemctl is-active mysql)"
echo ""
echo "PM2 Status:"
pm2 jlist 2>/dev/null | jq -r '.[] | "\(.name): \(.pm2_env.status)"' 2>/dev/null || pm2 list
echo ""

echo "🌐 CONECTIVIDADE:"
echo "Porta 80: $(curl -s -o /dev/null -w '%{http_code}' http://localhost || echo 'ERRO')"
echo "Porta 3000: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'ERRO')"
echo ""

echo "🔐 CERTIFICADOS SSL:"
if [ -d "/etc/letsencrypt/live" ]; then
    for cert in /etc/letsencrypt/live/*/cert.pem; do
        if [ -f "$cert" ]; then
            domain=$(basename $(dirname $cert))
            expiry=$(openssl x509 -in "$cert" -noout -enddate | cut -d= -f2)
            echo "$domain: $expiry"
        fi
    done
else
    echo "Nenhum certificado Let's Encrypt encontrado"
fi
echo ""

echo "📊 LOGS RECENTES (últimas 10 linhas):"
echo "Aplicação:"
pm2 logs omada-voucher --lines 10 2>/dev/null | tail -10
echo ""
echo "Nginx Error:"
sudo tail -5 /var/log/nginx/error.log 2>/dev/null || echo "Log não encontrado"
echo ""

echo "🔍 CONFIGURAÇÃO OMADA:"
if [ -f "/opt/omada-voucher/.env" ]; then
    echo "URL: $(grep OMADA_URL /opt/omada-voucher/.env | cut -d= -f2)"
    echo "Client ID: $(grep OMADA_CLIENT_ID /opt/omada-voucher/.env | cut -d= -f2 | cut -c1-8)..."
    echo "Omadac ID: $(grep OMADA_OMADAC_ID /opt/omada-voucher/.env | cut -d= -f2 | cut -c1-8)..."
else
    echo "Arquivo .env não encontrado"
fi

echo ""
echo "=== FIM DO DIAGNÓSTICO ==="
```

### Como usar:
```bash
# Tornar executável
sudo chmod +x /usr/local/bin/omada-diagnostics

# Executar
omada-diagnostics

# Salvar relatório
omada-diagnostics > /tmp/diagnostico-$(date +%Y%m%d).txt
```

## 🔄 Scripts de Recuperação Automática

### Script de Auto-Healing

```bash
#!/bin/bash
# Salvar como: /usr/local/bin/omada-healing

LOG_FILE="/var/log/omada-healing.log"

log() {
    echo "[$(date)] $1" | tee -a $LOG_FILE
}

# Verificar se aplicação está respondendo
if ! curl -s -f http://localhost:3000 > /dev/null; then
    log "ERRO: Aplicação não está respondendo"
    
    # Tentar reiniciar PM2
    log "Reiniciando aplicação..."
    pm2 restart omada-voucher
    sleep 10
    
    # Verificar novamente
    if curl -s -f http://localhost:3000 > /dev/null; then
        log "SUCESSO: Aplicação reiniciada com sucesso"
    else
        log "ERRO: Falha ao reiniciar aplicação"
        # Enviar alerta (email, webhook, etc.)
    fi
fi

# Verificar MySQL
if ! mysqladmin ping -h localhost --silent; then
    log "ERRO: MySQL não está respondendo"
    log "Reiniciando MySQL..."
    sudo systemctl restart mysql
    sleep 15
    
    if mysqladmin ping -h localhost --silent; then
        log "SUCESSO: MySQL reiniciado com sucesso"
    else
        log "ERRO: Falha ao reiniciar MySQL"
    fi
fi

# Verificar Nginx
if ! sudo nginx -t > /dev/null 2>&1; then
    log "ERRO: Configuração Nginx inválida"
elif ! curl -s -f http://localhost > /dev/null; then
    log "ERRO: Nginx não está respondendo"
    log "Reiniciando Nginx..."
    sudo systemctl restart nginx
    
    if curl -s -f http://localhost > /dev/null; then
        log "SUCESSO: Nginx reiniciado com sucesso"
    else
        log "ERRO: Falha ao reiniciar Nginx"
    fi
fi

# Verificar espaço em disco
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    log "AVISO: Uso de disco alto: ${DISK_USAGE}%"
    # Limpar logs antigos
    find /var/log -name "*.log" -mtime +7 -exec rm {} \;
    pm2 flush
fi

log "Verificação concluída"
```

### Configurar no crontab:
```bash
# Executar a cada 5 minutos
sudo crontab -e
# Adicionar: */5 * * * * /usr/local/bin/omada-healing
```

## 📞 Quando Pedir Ajuda

Antes de solicitar suporte, execute e envie:

```bash
# Gerar relatório completo
omada-diagnostics > relatorio-$(date +%Y%m%d).txt

# Incluir logs específicos
echo "=== LOGS DETALHADOS ===" >> relatorio-$(date +%Y%m%d).txt
pm2 logs omada-voucher --lines 50 >> relatorio-$(date +%Y%m%d).txt
sudo tail -50 /var/log/nginx/error.log >> relatorio-$(date +%Y%m%d).txt
```

### Informações Importantes:
- Versão do sistema operacional
- Tipo de instalação (tradicional/Docker)
- Mensagem de erro completa
- Passos que levaram ao problema
- Mudanças recentes no sistema

---

**Guia de Troubleshooting v1.0**