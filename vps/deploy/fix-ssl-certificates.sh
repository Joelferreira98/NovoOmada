#!/bin/bash

# Script para corrigir problemas de certificados SSL no ambiente VPS
# Arquivo: fix-ssl-certificates.sh

set -e

echo "🔒 Corrigindo problemas de certificados SSL..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório raiz do projeto"
    exit 1
fi

# Parar aplicação se estiver rodando
if command -v pm2 >/dev/null 2>&1; then
    echo "🛑 Parando aplicação..."
    pm2 stop omada-voucher 2>/dev/null || echo "ℹ️ Aplicação não estava rodando"
fi

# Verificar configuração SSL no código
echo "🔍 Verificando configurações SSL..."

# Garantir que NODE_TLS_REJECT_UNAUTHORIZED está desabilitado
if ! grep -q "NODE_TLS_REJECT_UNAUTHORIZED.*0" server/index.ts; then
    echo "⚠️ Configuração SSL não encontrada no código"
    echo "ℹ️ Verifique se o arquivo server/index.ts tem a configuração SSL correta"
fi

# Testar conectividade com o controlador Omada
if [ -n "$OMADA_URL" ]; then
    echo "🧪 Testando conectividade com $OMADA_URL..."
    
    # Tentar conectar ignorando certificados SSL
    if curl -k -s --connect-timeout 10 "$OMADA_URL" >/dev/null 2>&1; then
        echo "✅ Conexão com controlador Omada OK"
    else
        echo "❌ Falha na conexão com controlador Omada"
        echo "ℹ️ Verifique se o controlador está acessível e a URL está correta"
    fi
else
    echo "⚠️ OMADA_URL não definida no ambiente"
fi

# Reinstalar node_modules se necessário
if [ "$1" == "--reinstall" ]; then
    echo "📦 Reinstalando dependências..."
    rm -rf node_modules package-lock.json
    npm install --production
fi

# Reiniciar aplicação
if command -v pm2 >/dev/null 2>&1; then
    echo "🚀 Reiniciando aplicação..."
    pm2 start ecosystem.config.js 2>/dev/null || pm2 restart omada-voucher 2>/dev/null || echo "❌ Falha ao reiniciar com PM2"
fi

echo "✅ Correção de SSL concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verifique se a aplicação está rodando: pm2 status"
echo "2. Teste o login no sistema"
echo "3. Verifique os logs: pm2 logs omada-voucher"
echo ""
echo "💡 Se ainda houver problemas SSL:"
echo "   - Verifique se OMADA_URL está correto no .env"
echo "   - Confirme se o controlador Omada está acessível"
echo "   - Execute: ./deploy/fix-ssl-certificates.sh --reinstall"