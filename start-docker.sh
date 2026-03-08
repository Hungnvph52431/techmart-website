#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 TechMart Docker Starter${NC}\n"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker daemon is not running${NC}"
    echo "Starting Docker Desktop..."
    
    # Try to start Docker Desktop (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open -a Docker
        echo "Waiting for Docker to start..."
        
        # Wait for Docker daemon to be ready (max 60 seconds)
        counter=0
        while ! docker info &> /dev/null && [ $counter -lt 60 ]; do
            sleep 2
            counter=$((counter + 2))
            echo -n "."
        done
        echo ""
        
        if docker info &> /dev/null; then
            echo -e "${GREEN}✅ Docker is now running!${NC}\n"
        else
            echo -e "${RED}❌ Failed to start Docker. Please start Docker Desktop manually.${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Please start Docker manually and run this script again.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Docker is running${NC}\n"
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not available!${NC}"
    exit 1
fi

echo -e "${BLUE}Starting TechMart services...${NC}\n"

# Start services
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

# Check if services started successfully
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ All services started successfully!${NC}\n"
    echo -e "${BLUE}📱 Access your application:${NC}"
    echo -e "   Frontend:  ${GREEN}http://localhost:5173${NC}"
    echo -e "   Backend:   ${GREEN}http://localhost:5001${NC}"
    echo -e "   MySQL:     ${GREEN}localhost:3306${NC}\n"
    
    echo -e "${BLUE}📊 View logs:${NC}"
    echo -e "   docker-compose logs -f\n"
    
    echo -e "${BLUE}🛑 Stop services:${NC}"
    echo -e "   docker-compose down\n"
else
    echo -e "${RED}❌ Failed to start services${NC}"
    echo "Check logs with: docker-compose logs"
    exit 1
fi
