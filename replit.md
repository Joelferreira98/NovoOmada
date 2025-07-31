# Omada WiFi Voucher Management System

## Overview

This is a full-stack web application built for managing WiFi vouchers through Omada controllers. The system provides role-based access control with three distinct user types: Master (system admin), Admin (site manager), and Vendedor (voucher seller). The application uses a modern React frontend with Express.js backend, MySQL database with Drizzle ORM, and integrates with Omada WiFi controllers for voucher generation and management.

## Recent Changes (July 31, 2025)

✓ **Sistema de Reimpressão Dual A4/Cupom - COMPLETO**: Funcionalidade completa de reimpressão com múltiplos formatos
- **Reimpressão A4**: Botão dedicado para reimprimir vouchers em formato A4 padrão
- **Reimpressão Térmica**: Botão dedicado para reimprimir vouchers em formato cupom térmico
- **Download Duplo**: Opções de download em JSON (códigos) e HTML (página completa)
- **Validação Robusta**: Verificação de códigos válidos antes da reimpressão
- **Interface Agrupada**: Botões organizados em grupos para melhor usabilidade
- **Feedback Visual**: Tooltips explicativos e mensagens de erro específicas

✓ **Dashboard Admin Padrão Vendedor - COMPLETO**: Implementação completa seguindo padrão visual do vendedor
- **Background Gradiente**: Mesmo fundo linear-gradient(135deg, #667eea 0%, #764ba2 100%) do vendedor
- **Layout Grid Bootstrap**: Sistema container-fluid > row > col responsivo idêntico
- **Sidebar Consistente**: Navegação lateral branca com shadow-lg e bordas consistentes
- **Cards com Shadow**: Cards brancos com shadow-lg e hover effects suaves
- **Header Card**: Card de cabeçalho com informações do site igual ao vendedor
- **Stats Cards**: Cards de estatísticas com ícones gradientes e layouts consistentes
- **Quick Actions**: Seção de ações rápidas com cards de navegação
- **Efeitos Hover**: Animações suaves em cards e botões (translateY)
- **Cores Unificadas**: Paleta de cores idêntica ao dashboard do vendedor
- **Responsividade**: Mobile-first com col-12 col-lg-9 col-xl-10 para main content
- **Layout Responsivo**: Sistema de grid Bootstrap (container-fluid, row, col-*) em todo o dashboard admin
- **Sidebar Bootstrap**: Navegação lateral responsiva com menu colapsável para mobile
- **Formulários Adaptativos**: Inputs HTML5 com classes Bootstrap (form-control, form-label)
- **Botões Responsivos**: Botões Bootstrap com d-flex e gap para mobile e desktop
- **Typography Unificada**: Classes Bootstrap (h2 h1-lg, fw-bold, text-muted) consistentes
- **Cards de Estatísticas**: Dashboard com visão geral de vendedores, planos e vouchers
- **Gerenciamento Completo**: Abas para Vendedores, Planos, Vouchers e Relatórios
- **Funcionalidade Vouchers**: Sistema completo de criação e impressão de vouchers pelo admin
- **Impressão Dual**: Botões A4 e cupom térmico para impressão de vouchers gerados
- **Mobile-First**: Stacks verticais em mobile, horizontais em desktop (flex-column flex-lg-row)

✓ **Sistema de Upload de Logo/Favicon - COMPLETO**: Funcionalidade completa de upload implementada
- **Upload via Multer**: Sistema robusto de upload de arquivos com validação de tamanho (5MB)
- **Rotas de Upload**: /api/upload-logo e /api/upload-favicon com autenticação
- **Arquivos Estáticos**: Servindo uploads via rota /uploads para acesso público
- **Interface Dual**: Opção de upload de arquivos OU inserção de URL
- **Validação Completa**: Tipos de arquivo (.ico, imagens) e tamanho validados
- **Feedback Visual**: Botões com status de upload e opção de remover arquivos

✓ **Sistema de Impressão Dual Restaurado - COMPLETO**: Opções de impressão A4 e cupom térmico funcionais
- **Print Options Restored**: Botões de impressão A4 e cupom térmico restaurados após transformação Bootstrap
- **Dual Format Support**: Impressão em formato A4 (papel padrão) e cupom térmico (58mm/80mm)
- **Smart Layout**: Grid responsivo otimizado para papel A4 com ajuste automático baseado na quantidade
- **Thermal Support**: Layout específico para impressoras térmicas com quebra de página individual
- **Print History Integration**: Todas as impressões são salvas automaticamente no histórico
- **Professional Output**: Vouchers com design limpo, códigos destacados e informações completas
- **Real-time Feedback**: Mensagens de sucesso e contadores de vouchers em tempo real
- **Cancel Option**: Botão para cancelar impressão e limpar vouchers gerados

✓ **Dashboard Master Responsivo Bootstrap - COMPLETO**: Conversão completa para Bootstrap mobile-first
- **Layout Responsivo**: Sistema de grid Bootstrap (container-fluid, row, col-*) em todo o dashboard
- **Cards Bootstrap**: Substituição completa das UI Cards shadcn por cards Bootstrap nativos
- **Formulários Adaptativos**: Inputs HTML5 com classes Bootstrap (form-control, form-label)
- **Botões Responsivos**: Botões Bootstrap com d-flex e gap para mobile e desktop
- **Typography Unificada**: Classes Bootstrap (h2 h1-lg, fw-bold, text-muted) consistentes
- **Dashboard Overview**: Cards de estatísticas com ícones e métricas do sistema
- **Gerenciamento Usuários**: Listas responsivas de admins e vendedores com badges
- **Sincronização Omada**: Formulário de credenciais totalmente responsivo
- **Sites Management**: Lista de sites com status e informações organizadas
- **Mobile-First**: Stacks verticais em mobile, horizontais em desktop (flex-column flex-lg-row)

✓ **Sistema de Histórico de Impressões Completo**: Funcionalidade completa de reimpressão implementada
- **Print History Database**: Tabela print_history criada automaticamente no MySQL
- **Auto Save**: Todas as impressões (A4 e térmicas) são salvas automaticamente
- **Reprint Interface**: Aba "Reimprimir Vouchers" com botões para reimprimir, download e exclusão
- **Smart JSON Handling**: Sistema robusto de parsing JSON para códigos de vouchers
- **Debug Logging**: Logs detalhados para monitoramento do sistema

✓ **Sistema de Relatórios Avançado por Preço e Duração - NEW**: Funcionalidades completas de análise temporal
- **Price Distribution API**: Endpoint `/api/reports/voucher-price-distribution` com filtros de data
- **Duration Distribution API**: Endpoint `/api/reports/voucher-duration-distribution` com análise temporal
- **Date Range Filtering**: Ambas APIs usam `filters.timeStart` e `filters.timeEnd` conforme documentação Omada
- **Enhanced UI**: Abas "Por Preço" e "Distribuição" atualizadas com períodos selecionáveis
- **Price Correction**: Corrigido envio de preço decimal para API Omada (não mais em centavos)
- **Duration Analysis**: Análise detalhada por tipo de duração (cliente vs voucher) com aproveitamento
- **Real-time Data**: Consultas diretas à API Omada com dados autênticos
- **Period Summaries**: Resumos consolidados para ambos os tipos de distribuição

✓ **Menu Atualizado**: Substituído "Caixa" por "Relatórios" no dashboard do vendedor
- **Direct Access**: Link direto para o sistema completo de relatórios
- **Better UX**: Acesso mais intuitivo às funcionalidades de análise de dados

✓ **Sistema de Impressão Dual: A4 + Cupom Térmico**: Layout adaptável para diferentes impressoras
- **A4 Print**: Grid responsivo otimizado para papel A4 (até 100 vouchers)
- **Thermal Roll Print**: Layout específico para impressoras térmicas 58/80mm
- **Smart Detection**: Sistema detecta automaticamente o tipo de impressora
- **Dual Buttons**: Opções separadas "A4" e "Cupom" para escolha do usuário
- **Professional Layout**: Cards otimizados para cada formato de impressão

✓ **Correção Sistema de Vendas Automáticas**: Corrigido problema de vouchers sendo vendidos ao serem criados
- **Sale Logic Fixed**: Removida criação automática de vendas na geração de vouchers
- **Available Status**: Vouchers agora ficam corretamente como 'available' até serem realmente usados
- **Real Sales Only**: Vendas são criadas apenas quando vouchers são marcados como 'used' pelo Omada
- **Proper Tracking**: Sistema diferencia corretamente vouchers disponíveis vs vendidos

✓ **Sistema de Exclusão de Vouchers com Callback Token**: Implementação robusta de delete via API Omada
- **Callback System**: Sistema de renovação de token com callbacks para operações críticas
- **Token Crítico**: Função `getCriticalToken` garante tokens válidos para operações sensíveis
- **Queue Management**: Gerencia múltiplas requisições simultâneas de token
- **High Priority**: Operações críticas como delete têm prioridade alta
- **Timeout Protection**: Sistema de timeout para evitar travamentos

✓ **Sistema de Tokens e Autenticação Omada - FINAL**: Sistema robusto de autenticação implementado
- **Auto-renovação de tokens**: Sistema renova tokens automaticamente 30 minutos antes do vencimento
- **Cache inteligente**: Tokens ficam em cache com timer automático de renovação
- **Campos MySQL corrigidos**: Todos os campos obrigatórios (`voucher_code`, `created_by`) mapeados corretamente
- **SQL direto**: Inserção via SQL raw para garantir compatibilidade total com MySQL
- **Demo desabilitado**: Sistema só funciona com credenciais Omada válidas (sem fallback demo)
- **Logs detalhados**: Sistema completo de debugging para troubleshooting

✓ **Complete CRUD System Implementation**: Full create, read, update, delete functionality for vendedores and plans
- **Admin Dashboard Enhanced**: Tabbed interface with comprehensive management tools
- **Vendedor Management**: Create, edit, and delete vendors with site assignment
- **Plan Management**: Complete CRUD operations for WiFi voucher plans
- **Permission System**: Role-based access - admins can manage vendedores and plans within their sites
- **Database Operations**: All CRUD operations working correctly with MySQL backend
- **User Interface**: Responsive tables, modal forms, and confirmation dialogs

✓ **Advanced Reporting System - NEW**: Comprehensive analytics using real Omada API data
- **Three Report Types**: Voucher summary (all-time), usage history (time-based), and duration distribution
- **Real Omada Integration**: Direct API calls to controller for authentic voucher statistics
- **Interactive Interface**: Date range selection, site filtering, tabbed navigation
- **Visual Analytics**: Cards for summary data, detailed tables for historical trends
- **Permission-Based Access**: Site-specific reporting based on user access rights
- **Admin Dashboard Integration**: Direct access to reports from admin interface

✓ **Database Migration**: Successfully migrated from PostgreSQL to MySQL
- Updated database connection to use hsstm.shop MySQL server
- Fixed all `.returning()` method incompatibilities with MySQL
- All CRUD operations now working correctly with MySQL
- Created all necessary tables with proper foreign key relationships

✓ **Omada Integration - COMPLETE AND FUNCTIONAL**: 
- **FINAL SUCCESS**: Client Credentials Mode fully functional following user's Python implementation
- **Real API working**: Successfully synchronized 3 real sites from Omada controller
- **Sites retrieved**: "Default", "Golfinho do Mar II", "LANCHA AK" from production Omada
- **Token management**: Access tokens obtained successfully with 7200s expiration
- **Database integration**: Sites properly stored in MySQL with full schema
- **Error handling**: SSL certificate and authentication properly configured
- **Production ready**: System working with real Omada credentials and data

✓ **User Management & Site Assignment - COMPLETE**: 
- **Site assignment system fully functional**: Masters can assign sites to admin users
- **Fixed schema issues**: Corrected user_site_access table structure and relationships
- **Permission system working**: Role-based access controls implemented and tested
- **Admin user management**: Can create, edit, and assign sites to admin users via interface

✓ **Admin Dashboard with Site Selection - COMPLETE**:
- **Multi-site admin support**: Admins with multiple sites get site selection page
- **Automatic redirection**: Single site admins go directly to dashboard
- **Site switching**: Admins can change sites using "Trocar Site" button
- **LocalStorage integration**: Selected site persists across sessions
- **Smart routing**: Role-based redirection system implemented

✓ **Plan Creation System - COMPLETE AND FUNCTIONAL**: 
- **MySQL compatibility**: Schema fully synchronized with database structure
- **UUID generation**: Fixed auto-generation for MySQL using crypto.randomUUID()
- **Foreign key relationships**: Resolved created_by field integration with users table
- **Validation system**: Complete form validation with Zod schemas
- **User interface**: Clean form with duration conversion (hours/days to minutes)
- **Concurrent users option**: Added field for simultaneous user limits (1-10)
- **Omada API mapping**: All plans standardized to Limited Online Users (limitType: 1)
- **Simplified interface**: Removed type selection - all plans use same limit type
- **Real data integration**: Plans properly stored and retrieved from MySQL
- **Success confirmation**: Plan creation working end-to-end

✓ **Authentication System**: 
- Master user account: username "master", password "master123"
- Current admin user: username "Joel", role "admin"
- Session-based authentication working with MySQL backend
- Protected routes with role-based access control

✓ **System Architecture**: 
- Removed manual site creation - sites only synchronized from Omada
- Authorization Code Flow fully implemented per Omada documentation
- Real API error handling without demo data insertion
- Ready for production with valid Omada credentials

## User Preferences

```
Preferred communication style: Simple, everyday language.
```

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite for development and production builds
- **Form Management**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Password Security**: Native crypto module with scrypt hashing
- **API Design**: RESTful API with role-based middleware protection

### Database Architecture
- **Database**: MySQL (host: hsstm.shop, database: omada_dev)
- **ORM**: Drizzle ORM with TypeScript schema definitions and MySQL compatibility
- **Migrations**: Drizzle Kit for schema management
- **Connection**: MySQL2 connection pooling

## Key Components

### Authentication & Authorization
- **Multi-role system**: Master, Admin, and Vendedor roles with different permissions
- **Session-based authentication**: Secure session management with PostgreSQL storage
- **Protected routes**: Role-based route protection on both frontend and backend
- **Password security**: Salted scrypt hashing for password storage

### Database Schema
- **Users table**: Stores user credentials and role assignments
- **Sites table**: Manages different WiFi locations with Omada integration
- **Plans table**: Defines voucher templates with pricing and limits
- **Vouchers table**: Tracks generated vouchers and their usage status
- **Sales table**: Records voucher sales transactions
- **User-Site Access**: Many-to-many relationship for site access control
- **Omada Credentials**: Stores controller connection information

### Role-Based Features
- **Master Dashboard**: Global system management, Omada credential configuration, site creation
- **Admin Dashboard**: Site-specific management, plan creation, seller oversight
- **Vendedor Dashboard**: Voucher generation, sales tracking, daily statistics

### External Integrations
- **Omada Controller API**: Integration for voucher generation and WiFi management
- **Neon Database**: Serverless PostgreSQL for production deployment

## Data Flow

### Authentication Flow
1. User submits login credentials
2. Passport.js validates against database
3. Session created and stored in PostgreSQL
4. Role-based dashboard redirection
5. Subsequent requests authenticated via session cookies

### Voucher Generation Flow
1. Vendedor selects plan and quantity
2. Frontend validates request and sends to backend
3. Backend creates voucher records in database
4. Integration with Omada controller for WiFi voucher creation
5. Voucher codes returned to frontend for display/printing

### Site Management Flow
1. Master creates sites with Omada integration details
2. Admin users assigned to specific sites
3. Admins create plans specific to their sites
4. Vendedor users generate vouchers from available plans

## External Dependencies

### Production Dependencies
- **Database**: Neon PostgreSQL serverless database
- **Session Store**: Redis-compatible session storage via PostgreSQL
- **Omada Integration**: Direct API integration with TP-Link Omada controllers
- **Authentication**: Passport.js ecosystem for authentication strategies

### Development Dependencies
- **Build Tools**: Vite, esbuild for production builds
- **Type Checking**: TypeScript compiler
- **Database Tools**: Drizzle Kit for migrations and schema management
- **Replit Integration**: Cartographer and runtime error overlay for development

### UI Dependencies
- **Component Library**: Comprehensive Radix UI primitive components
- **Icons**: Lucide React icon library
- **Styling**: Tailwind CSS with PostCSS processing
- **Form Validation**: React Hook Form with Zod schema validation
- **Date Handling**: date-fns for date manipulation

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: esbuild compiles TypeScript server to `dist/index.js`
- **Database**: Drizzle migrations applied via `db:push` command
- **Environment**: Production mode uses compiled assets, development uses Vite dev server

### Environment Configuration
- **Database URL**: Required PostgreSQL connection string
- **Session Secret**: Required for session encryption
- **Omada Credentials**: Configured per-site via admin interface
- **Trust Proxy**: Enabled for session security in production

### Development Setup
- **Hot Reload**: Vite HMR for frontend, tsx for backend auto-restart
- **Database**: Local or remote PostgreSQL via DATABASE_URL
- **Replit Integration**: Special handling for Replit development environment
- **Error Handling**: Runtime error overlays and comprehensive logging

The application follows a monorepo structure with shared TypeScript types between frontend and backend, ensuring type safety across the entire application stack. The architecture supports horizontal scaling through stateless API design and external session storage.