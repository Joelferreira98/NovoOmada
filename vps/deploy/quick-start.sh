#!/bin/bash

# Quick Start Script for Omada Voucher System
echo "🚀 Omada Voucher System - Quick Start"
echo "======================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}Escolha o tipo de instalação:${NC}"
echo "1. Instalação Tradicional (recomendada para produção)"
echo "2. Instalação com Docker (recomendada para desenvolvimento)"
echo ""

read -p "Digite sua escolha (1 ou 2): " choice

case $choice in
    1)
        echo -e "${GREEN}Iniciando instalação tradicional...${NC}"
        ./install.sh
        ;;
    2)
        echo -e "${GREEN}Iniciando instalação com Docker...${NC}"
        ./docker-install.sh
        ;;
    *)
        echo -e "${YELLOW}Escolha inválida. Execute o script novamente.${NC}"
        exit 1
        ;;
esac