#!/bin/bash

# Script para preparar versão VPS do Omada Voucher Management System
echo "🚀 Preparando versão VPS..."

# Verificar se a pasta vps existe
if [ ! -d "vps" ]; then
    echo "❌ Pasta vps não encontrada!"
    exit 1
fi

cd vps

# Limpar dependências desnecessárias
echo "🧹 Limpando dependências PostgreSQL..."
sed -i '/@neondatabase\/serverless/d' package.json
sed -i '/@types\/pg/d' package.json  
sed -i '/connect-pg-simple/d' package.json
sed -i '/"pg":/d' package.json

# Adicionar memorystore se não existir
if ! grep -q "memorystore" package.json; then
    echo "📦 Adicionando memorystore..."
    sed -i '/mysql2/a\    "memorystore": "^1.6.3",' package.json
fi

# Criar estrutura de logs
echo "📁 Criando estrutura de logs..."
mkdir -p logs

# Tornar scripts executáveis
echo "🔧 Configurando permissões..."
chmod +x deploy/*.sh

cd ..

# Criar arquivo compactado para upload
echo "📦 Criando arquivo para upload..."
tar -czf omada-voucher-vps-$(date +%Y%m%d_%H%M%S).tar.gz vps/

echo "✅ Versão VPS preparada com sucesso!"
echo ""
echo "📋 Arquivos criados:"
echo "- vps/ - Pasta com projeto otimizado para VPS"
echo "- omada-voucher-vps-*.tar.gz - Arquivo compactado para upload"
echo ""
echo "📤 Próximos passos:"
echo "1. Fazer upload do arquivo .tar.gz para o servidor"
echo "2. Extrair em /opt/omada-voucher"
echo "3. Seguir instruções em vps/deploy-instructions.md"