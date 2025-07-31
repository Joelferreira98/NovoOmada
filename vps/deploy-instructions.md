# 📦 Instruções de Deploy para VPS

## 🚀 Upload e Instalação

### 1. Fazer Upload do Projeto
```bash
# Comprimir a pasta vps
tar -czf omada-voucher-vps.tar.gz vps/

# Upload para o servidor
scp omada-voucher-vps.tar.gz user@seu-servidor:/tmp/

# No servidor, extrair
ssh user@seu-servidor
cd /opt
sudo tar -xzf /tmp/omada-voucher-vps.tar.gz
sudo mv vps omada-voucher
sudo chown -R omada-voucher:omada-voucher /opt/omada-voucher
```

### 2. Configuração Rápida
```bash
cd /opt/omada-voucher
cp .env.example .env

# Editar variáveis de ambiente
sudo nano .env
```

### 3. Instalar e Executar
```bash
# Instalar dependências
npm install --production

# Build do projeto
npm run build

# Iniciar com PM2
npm run pm2:start
```

## 🔧 Comandos Úteis

### Gerenciamento PM2
```bash
npm run pm2:start    # Iniciar aplicação
npm run pm2:stop     # Parar aplicação  
npm run pm2:restart  # Reiniciar aplicação
npm run pm2:logs     # Ver logs em tempo real
```

### Verificação de Status
```bash
pm2 status           # Status de todos os processos
pm2 monit           # Monitor em tempo real
```

## 🔍 Troubleshooting

### Se a aplicação não iniciar:
1. Verificar logs: `npm run pm2:logs`
2. Verificar conectividade MySQL: `mysql -h hsstm.shop -u root -p`
3. Executar script de correção de sessão: `./deploy/fix-session-store.sh`

### Para erro de certificado SSL (UNABLE_TO_VERIFY_LEAF_SIGNATURE):
```bash
# Execute o script de correção SSL
./deploy/fix-ssl-certificates.sh

# Se necessário, reinstalar dependências
./deploy/fix-ssl-certificates.sh --reinstall
```

### Erro específico na API Omada:
- O sistema já está configurado para ignorar certificados SSL auto-assinados
- Verifique se OMADA_URL está correto em .env
- Teste conectividade: `curl -k -s https://omada.camstm.com:8043`

### Portas em Uso:
```bash
# Verificar processo na porta 3000
lsof -i :3000

# Matar processo se necessário
sudo kill -9 PID
```

## ✅ Verificação Final

Após deploy, verificar:
- [ ] Aplicação rodando na porta 3000
- [ ] Login funcionando
- [ ] Conexão com MySQL
- [ ] API Omada respondendo
- [ ] Logs sem erros críticos