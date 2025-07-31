# 🚀 Omada Voucher Management System - VPS Version

Esta é a versão otimizada para produção no VPS, configurada especificamente para funcionar com:
- MySQL remoto (hsstm.shop)
- Session store em memória (sem PostgreSQL)
- SSL desabilitado para desenvolvimento
- Configurações de produção otimizadas

## 📋 Diferenças da Versão Replit

### Configurações Modificadas:
1. **Database**: Conecta diretamente ao MySQL remoto sem fallback PostgreSQL
2. **Session Store**: Usa memória em vez de PostgreSQL para sessões
3. **SSL**: Configurado para ambiente de produção
4. **Dependências**: Removidas dependências PostgreSQL desnecessárias

### Arquivos Principais Modificados:
- `server/db.ts` - Conexão MySQL otimizada
- `server/storage.ts` - Session store em memória
- `server/auth.ts` - Configuração de sessão para produção
- `package.json` - Dependencies limpo

## 🛠️ Instalação no VPS

### 1. Upload dos Arquivos
```bash
# Fazer upload desta pasta vps/ para /opt/omada-voucher/
rsync -avz vps/ user@seu-servidor:/opt/omada-voucher/
```

### 2. Configurar Ambiente
```bash
cd /opt/omada-voucher
cp .env.example .env
nano .env  # Configure suas variáveis
```

### 3. Instalar Dependências
```bash
npm install --production
```

### 4. Build da Aplicação
```bash
npm run build
```

### 5. Executar
```bash
# Usando PM2 (recomendado)
pm2 start ecosystem.config.js

# Ou diretamente
npm start
```

## 📊 Monitoramento

### Logs em Tempo Real
```bash
pm2 logs omada-voucher
```

### Status da Aplicação
```bash
pm2 status
```

### Reiniciar Aplicação
```bash
pm2 restart omada-voucher
```

## 🔧 Troubleshooting

Se houver problemas:

1. **Erro de Conexão MySQL**
   ```bash
   # Teste a conexão
   mysql -h hsstm.shop -u root -p11032020 -e "USE omada_dev; SHOW TABLES;"
   ```

2. **Erro de Session Store**
   ```bash
   # Execute o script de correção
   ./deploy/fix-session-store.sh
   ```

3. **Erro de Certificado SSL**
   ```bash
   # Execute o script de correção SSL
   ./deploy/fix-ssl-certificates.sh
   ```

3. **Porta em Uso**
   ```bash
   # Verificar processos na porta 3000
   lsof -i :3000
   ```

## 📁 Estrutura de Arquivos

```
vps/
├── client/          # Frontend React
├── server/          # Backend Express
├── shared/          # Types compartilhados
├── deploy/          # Scripts de deployment
├── package.json     # Dependencies de produção
├── .env.example     # Template de configuração
└── README_VPS.md    # Esta documentação
```

## 🚨 Importante

- Esta versão é específica para VPS e não deve ser executada no Replit
- Sempre faça backup antes de atualizar
- Configure as variáveis de ambiente antes de executar
- Use HTTPS em produção com certificado SSL válido