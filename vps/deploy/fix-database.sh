#!/bin/bash

# Script para corrigir problema de banco de dados no VPS
echo "🔧 Corrigindo configuração do banco de dados..."

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/opt/omada-voucher"

# Verificar se está no diretório correto
if [ ! -f "$APP_DIR/package.json" ]; then
    echo -e "${RED}Erro: Aplicação não encontrada em $APP_DIR${NC}"
    exit 1
fi

cd $APP_DIR

echo -e "${YELLOW}1. Verificando configuração atual...${NC}"

# Backup do arquivo original
if [ -f ".env" ]; then
    cp .env .env.backup
    echo "✓ Backup do .env criado"
fi

echo -e "${YELLOW}2. Configurando variáveis do MySQL...${NC}"

# Criar configuração MySQL
cat > .env.mysql << 'EOF'
# Database Configuration - MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=omada_voucher
DB_USER=omada_user
DB_PASSWORD=sua_senha_aqui

# Application Configuration
NODE_ENV=production
PORT=3000
SESSION_SECRET=sua_chave_secreta_muito_longa_e_segura_aqui

# Omada Controller Configuration
OMADA_URL=https://192.168.1.10:8043
OMADA_CLIENT_ID=seu_client_id
OMADA_CLIENT_SECRET=seu_client_secret
OMADA_OMADAC_ID=seu_omadac_id
EOF

echo "✓ Arquivo .env.mysql criado"

echo -e "${YELLOW}3. Criando configuração Drizzle para MySQL...${NC}"

# Criar configuração drizzle para MySQL
cat > drizzle.mysql.config.js << 'EOF'
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'omada_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'omada_voucher',
    port: parseInt(process.env.DB_PORT || '3306'),
  },
});
EOF

echo "✓ Configuração Drizzle MySQL criada"

echo -e "${YELLOW}4. Testando conexão MySQL...${NC}"

# Testar se MySQL está funcionando
if command -v mysql &> /dev/null; then
    if mysql -u root -p -e "SELECT 1;" 2>/dev/null; then
        echo "✓ MySQL está funcionando"
    else
        echo -e "${RED}⚠️ MySQL não está acessível. Verificar se está instalado e rodando.${NC}"
    fi
else
    echo -e "${RED}⚠️ MySQL não está instalado.${NC}"
fi

echo -e "${YELLOW}5. Instruções para continuar:${NC}"
echo ""
echo "1. Configure sua senha do banco no arquivo .env.mysql:"
echo "   nano .env.mysql"
echo ""
echo "2. Configure as credenciais do Omada no mesmo arquivo"
echo ""
echo "3. Copie a configuração para .env:"
echo "   cp .env.mysql .env"
echo ""
echo "4. Execute as migrações com a configuração MySQL:"
echo "   npx drizzle-kit push --config=drizzle.mysql.config.js"
echo ""
echo "5. Se der erro de permissão, execute como usuário omada-voucher:"
echo "   sudo -u omada-voucher npx drizzle-kit push --config=drizzle.mysql.config.js"
echo ""

echo -e "${GREEN}Script de correção executado com sucesso!${NC}"
echo -e "${YELLOW}Siga as instruções acima para completar a configuração.${NC}"