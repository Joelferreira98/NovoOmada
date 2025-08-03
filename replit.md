# Omada WiFi Voucher Management System

## Overview
This full-stack web application manages WiFi vouchers through Omada controllers, offering role-based access for Master (system admin), Admin (site manager), and Vendedor (voucher seller). It features a React frontend, Express.js backend, MySQL database with Drizzle ORM, and integrates with Omada WiFi controllers for voucher generation and management. The system aims to streamline voucher creation, tracking, and sales, providing detailed reporting and multi-site administration capabilities with a focus on usability and robust authentication.

## Deployment Status
**SYSTEM MODERNIZED WITH REACT ADMIN UI** - Design completely updated:
- ✅ React Admin UI template successfully implemented
- ✅ DaisyUI + Tailwind CSS integration complete
- ✅ Modern responsive layout with sidebar navigation
- ✅ New dashboard designs for Master, Admin, and Vendedor roles
- ✅ Reusable components: AdminLayout, StatsCard, DataTable
- ✅ React Icons integration for consistent iconography
- ✅ Mobile-first responsive design implemented
- ✅ Legacy dashboards preserved with -old routes
- ✅ SSL certificate connectivity with Omada API (ALL fetch() calls converted to omadaFetch)
- ✅ Authentication system fully functional with role-based access
- ✅ Voucher generation and printing system operational
- ✅ Omada API automatic sync service standardized with proper credential handling
- ✅ Token cache management with automatic clearing on credential updates
- ✅ Enhanced error reporting with troubleshooting guidance
- ✅ Diagnostics page created for testing and monitoring Omada credentials (/diagnostics)
- ✅ Logo and favicon display system fully implemented  
- ✅ Build process successful with optimized production assets
- ✅ Type checking passed with all TypeScript errors resolved
- ✅ Comprehensive error handling and logging implemented
- ✅ Complete deployment package created for server installation
- ✅ Session store configuration fixed for production environment
- ✅ Database connectivity optimized for MySQL remote connection
- ✅ PWA implemented for login page only with offline capability

## Server Deployment Package
Created comprehensive installation scripts for server deployment:
- **Repository**: https://github.com/Joelferreira98/NovoOmada
- **Traditional Installation**: Full Linux server setup with Nginx, MySQL, PM2
- **Docker Installation**: Containerized deployment with Docker Compose
- **Security Features**: SSL/TLS, firewall configuration, non-root execution
- **Monitoring**: Automated backups, log rotation, system monitoring
- **Management**: Start/stop scripts, update procedures, troubleshooting guides
- **Documentation**: Complete manuals, quick guides, and troubleshooting

## User Preferences
```
Preferred communication style: Simple, everyday language.
```

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS custom properties
- **Build Tool**: Vite
- **Form Management**: React Hook Form with Zod validation
- **Design Approach**: Mobile-first responsive design using Bootstrap principles (e.g., container-fluid, row, col-*) for consistent layout across dashboards. Unified typography, card styles (shadow-lg, hover effects), and color palettes for visual consistency. Dual printing options (A4 and thermal coupon) with optimized layouts.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Password Security**: Native crypto module with scrypt hashing
- **API Design**: RESTful API with role-based middleware protection
- **Key Features**: Auto-renewal of Omada tokens, robust voucher deletion with callback tokens, comprehensive CRUD for users, plans, and sites. Integration with Omada for real-time voucher statistics and generation, ensuring all operations reflect on the controller.

### Database Architecture
- **Database**: MySQL (specifically hsstm.shop, omada_dev)
- **ORM**: Drizzle ORM with TypeScript schema definitions
- **Migrations**: Drizzle Kit for schema management
- **Connection**: MySQL2 connection pooling
- **Schema**: Includes tables for Users, Sites, Plans, Vouchers, Sales, User-Site Access (many-to-many), and Omada Credentials. `print_history` table automatically saves all print actions.

### System Design Choices
- **Multi-role system**: Master, Admin, and Vendedor roles with distinct permissions.
- **Session-based authentication**: Secure session management.
- **Protected routes**: Role-based protection on both frontend and backend.
- **Site Assignment**: Master can assign sites to Admin users; Admins can manage within their assigned sites.
- **Voucher System**: Allows creation and printing of vouchers (A4/thermal) with history tracking and reprinting capabilities.
- **Reporting**: Advanced analytics on voucher usage, price, and duration distribution, directly from Omada API.
- **Authentication Flow**: Login, session creation, and role-based dashboard redirection.
- **Voucher Generation Flow**: Frontend request to backend, database record creation, Omada API integration, and return of voucher codes.
- **Navigation**: Simplified navigation with direct links to reports page from vendor dashboard.
- **Monorepo Structure**: Shared TypeScript types for full-stack type safety.
- **Scalability**: Stateless API design with external session storage.

## External Dependencies

### Production Dependencies
- **Database**: Neon PostgreSQL (for session storage, although primary data is MySQL)
- **Omada Integration**: Direct API integration with TP-Link Omada controllers
- **Authentication**: Passport.js ecosystem

### Development Dependencies
- **Build Tools**: Vite, esbuild
- **Type Checking**: TypeScript compiler
- **Database Tools**: Drizzle Kit
- **Replit Integration**: Cartographer and runtime error overlay

### UI Dependencies
- **Component Library**: Radix UI
- **Icons**: Lucide React
- **Styling**: Tailwind CSS, PostCSS
- **Form Validation**: React Hook Form with Zod
- **Date Handling**: date-fns