# 📋 Changelog - Versão VPS

## Principais Modificações para Produção

### ✅ Configurações de Database
- **server/db.ts**: Conexão MySQL direta para hsstm.shop
- **server/storage.ts**: Session store em memória (removido PostgreSQL)
- **shared/schema.ts**: Schema MySQL otimizado

### ✅ Configurações de Produção
- **NODE_ENV**: production por padrão
- **PORT**: 3000 (padrão VPS)
- **SSL**: Configurado para ambiente de produção
- **Session Secret**: Configuração segura obrigatória

### ✅ Dependências Otimizadas
- ❌ Removido: `pg`, `@types/pg`, `connect-pg-simple`
- ✅ Mantido: `memorystore` para sessões
- ✅ Adicionado: Scripts PM2 no package.json

### ✅ Scripts de Deployment
- `ecosystem.config.js`: Configuração PM2
- `deploy-instructions.md`: Guia completo de instalação
- `fix-session-store.sh`: Script de correção automática
- `.env.example`: Template com configurações VPS

### ✅ Documentação
- `README_VPS.md`: Documentação específica para VPS
- `CHANGELOG_VPS.md`: Este arquivo de mudanças
- Guias de troubleshooting atualizados

## 🔄 Diferenças da Versão Replit

| Componente | Replit | VPS |
|------------|--------|-----|
| Database | PostgreSQL + MySQL | MySQL apenas |
| Sessions | PostgreSQL Store | Memory Store |
| Port | 5000 | 3000 |
| Environment | development | production |
| SSL | Auto-disabled | Production ready |
| Process Manager | Workflow | PM2 |

## 🚨 Pontos de Atenção

1. **Session Store**: Usando memória - sessões serão perdidas ao reiniciar
2. **MySQL Remote**: Dependente da conectividade com hsstm.shop
3. **SSL Certificates**: Configurar certificados válidos em produção
4. **Backup**: Implementar backup automático do banco de dados
5. **Monitoring**: Configurar alertas de monitoramento

## 📅 Versão
- **Data**: Janeiro 2025
- **Compatibilidade**: Ubuntu 20.04+, Node.js 18+, MySQL 8.0+
- **Status**: Pronto para produção