# 🚨 Solução para Erros de Database e Session Store no VPS

## Problemas Identificados
1. **Database Error**: `received invalid response: 5b` - Drizzle tentando conectar ao PostgreSQL
2. **Session Store Error**: `ECONNREFUSED` - Erro na conexão PostgreSQL para sessões

## ✅ Solução Rápida para Session Store

### 1. Execute o script de correção para sessões:
```bash
# Baixar e executar script de correção de sessões
curl -fsSL https://raw.githubusercontent.com/Joelferreira98/NovoOmada/main/deploy/fix-session-store.sh | bash
```

### 2. Execute o script de correção de database (se necessário):
```bash
# Baixar e executar script de correção
curl -fsSL https://raw.githubusercontent.com/Joelferreira98/NovoOmada/main/deploy/fix-database.sh | bash

# Ou se já tem o repositório:
cd NovoOmada/deploy
./fix-database.sh
```

### 2. Configure o banco de dados:
```bash
# Editar configuração
cd /opt/omada-voucher
nano .env.mysql
```

**Configure essas variáveis:**
```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=omada_voucher
DB_USER=omada_user
DB_PASSWORD=SUA_SENHA_MYSQL

# Credenciais Omada
OMADA_URL=https://IP_DO_SEU_CONTROLADOR:8043
OMADA_CLIENT_ID=seu_client_id
OMADA_CLIENT_SECRET=seu_client_secret
OMADA_OMADAC_ID=seu_omadac_id
```

### 3. Aplicar configuração:
```bash
# Copiar configuração
cp .env.mysql .env

# Executar migrações MySQL
npx drizzle-kit push --config=drizzle.mysql.config.js
```

### 4. Se der erro de permissão:
```bash
sudo -u omada-voucher npx drizzle-kit push --config=drizzle.mysql.config.js
```

---

## 🔧 Solução Manual Detalhada

### Se o script automático não funcionar:

#### 1. Verificar MySQL:
```bash
# Verificar se MySQL está rodando
sudo systemctl status mysql

# Se não estiver, instalar/iniciar
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### 2. Criar banco e usuário:
```bash
# Conectar como root
sudo mysql

# Criar banco e usuário
CREATE DATABASE omada_voucher CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'omada_user'@'localhost' IDENTIFIED BY 'SuaSenhaSegura123!';
GRANT ALL PRIVILEGES ON omada_voucher.* TO 'omada_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 3. Testar conexão:
```bash
mysql -u omada_user -p omada_voucher
```

#### 4. Configurar aplicação:
```bash
cd /opt/omada-voucher

# Criar arquivo .env correto
cat > .env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=omada_voucher
DB_USER=omada_user
DB_PASSWORD=SuaSenhaSegura123!

# Application
NODE_ENV=production
PORT=3000
SESSION_SECRET=sua_chave_muito_longa_e_segura_aqui

# Omada Controller
OMADA_URL=https://192.168.1.10:8043
OMADA_CLIENT_ID=seu_client_id
OMADA_CLIENT_SECRET=seu_client_secret
OMADA_OMADAC_ID=seu_omadac_id
EOF
```

#### 5. Criar configuração Drizzle MySQL:
```bash
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
```

#### 6. Executar migrações:
```bash
npx drizzle-kit push --config=drizzle.mysql.config.js
```

#### 7. Iniciar aplicação:
```bash
npm run build
pm2 restart omada-voucher
```

---

## 🚀 Verificação Final

### Testar se funcionou:
```bash
# Status da aplicação
pm2 status

# Verificar logs
pm2 logs omada-voucher

# Testar endpoint
curl -I http://localhost:3000

# Verificar banco
mysql -u omada_user -p omada_voucher -e "SHOW TABLES;"
```

---

## 📞 Se Ainda Houver Problemas

### Logs para análise:
```bash
# Logs da aplicação
pm2 logs omada-voucher --lines 50

# Logs do MySQL
sudo tail -50 /var/log/mysql/error.log

# Status dos serviços
sudo systemctl status mysql nginx
```

### Reset completo se necessário:
```bash
# Parar aplicação
pm2 delete omada-voucher

# Limpar banco
sudo mysql -e "DROP DATABASE IF EXISTS omada_voucher;"

# Reexecutar instalação
cd NovoOmada/deploy
./install.sh
```

---

**Essa solução corrige especificamente o problema de configuração PostgreSQL vs MySQL no seu VPS.**