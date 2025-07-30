# Omada WiFi Voucher Management System

## Overview

This is a full-stack web application built for managing WiFi vouchers through Omada controllers. The system provides role-based access control with three distinct user types: Master (system admin), Admin (site manager), and Vendedor (voucher seller). The application uses a modern React frontend with Express.js backend, MySQL database with Drizzle ORM, and integrates with Omada WiFi controllers for voucher generation and management.

## Recent Changes (July 30, 2025)

✓ **Database Migration**: Successfully migrated from PostgreSQL to MySQL
- Updated database connection to use hsstm.shop MySQL server
- Fixed all `.returning()` method incompatibilities with MySQL
- All CRUD operations now working correctly with MySQL
- Created all necessary tables with proper foreign key relationships

✓ **Omada Integration**: 
- **FIXED**: Implemented correct OAuth2 client credentials format following official documentation
- **Query parameter**: `grant_type=client_credentials` 
- **JSON body**: `{"omadacId": "...", "client_id": "...", "client_secret": "..."}`
- SSL certificate handling for self-signed certificates
- No more "Invalid request parameters" errors
- API now correctly validates credentials and returns "Client Id Or Client Secret is Invalid" for test credentials
- Sites are synchronized from Omada API, not created manually
- System properly handles real API errors without inserting demo data

✓ **Authentication System**: 
- Master user account created and functional
- Session-based authentication working with MySQL backend

✓ **System Architecture**: 
- Removed manual site creation - sites only synchronized from Omada
- Credentials persist and update existing records
- No demo site insertion when API fails - shows real error messages
- Ready for real Omada credentials when provided

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