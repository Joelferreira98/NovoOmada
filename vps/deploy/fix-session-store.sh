#!/bin/bash

# Script para corrigir problemas de Session Store no ambiente de produção
# Arquivo: fix-session-store.sh

set -e

echo "🔧 Corrigindo configuração de Session Store..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório raiz do projeto"
    exit 1
fi

# Backup da configuração atual
if [ -f ".env" ]; then
    echo "📋 Fazendo backup da configuração atual..."
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Atualizar dependências se necessário
echo "📦 Verificando dependências..."
if ! npm list memorystore >/dev/null 2>&1; then
    echo "📦 Instalando memorystore..."
    npm install memorystore
fi

# Remover dependências PostgreSQL desnecessárias
echo "🗑️ Removendo dependências PostgreSQL desnecessárias..."
npm uninstall pg @types/pg connect-pg-simple || true

# Verificar conexão MySQL
echo "🔍 Verificando conectividade MySQL..."
if [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ]; then
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" 2>/dev/null && echo "✅ MySQL conectando corretamente" || echo "⚠️ Aviso: Não foi possível conectar ao MySQL"
else
    echo "⚠️ Variáveis de ambiente MySQL não definidas"
fi

# Reiniciar serviço se estiver usando PM2
if command -v pm2 >/dev/null 2>&1; then
    echo "🔄 Reiniciando aplicação com PM2..."
    pm2 restart omada-voucher 2>/dev/null || echo "ℹ️ PM2 não encontrado ou aplicação não está rodando"
fi

echo "✅ Correção de Session Store concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verifique se a aplicação está funcionando"
echo "2. Teste o login no sistema"
echo "3. Se houver problemas, verifique os logs: pm2 logs omada-voucher"