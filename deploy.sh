#!/bin/bash
# Financial Transfer Management System - Production Deployment Script

set -e

echo "🚀 Financial Transfer Management System - Production Deployment"
echo "==============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Create environment file if it doesn't exist
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env.local ]; then
        print_warning ".env.local not found. Creating from template..."
        cp env.production.example .env.local
        
        print_warning "Please edit .env.local with your production values:"
        echo "  - POSTGRES_PRISMA_URL"
        echo "  - POSTGRES_URL_NON_POOLING"
        echo "  - REDIS_URL (will be set automatically for Docker deployment)"
        echo ""
        read -p "Press Enter after editing .env.local to continue..."
    else
        print_success "Environment file .env.local exists"
    fi
}

# Build and deploy with Docker Compose
deploy_docker() {
    print_status "Building and deploying with Docker Compose..."
    
    # Set Redis URL for Docker deployment
    if ! grep -q "REDIS_URL=redis://redis:6379" .env.local; then
        echo "REDIS_URL=redis://redis:6379" >> .env.local
        print_success "Redis URL configured for Docker deployment"
    fi
    
    # Build and start services
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    docker-compose -f docker-compose.prod.yml build --no-cache
    docker-compose -f docker-compose.prod.yml up -d
    
    print_success "Services started successfully"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be healthy..."
    
    # Wait for Redis
    print_status "Checking Redis health..."
    for i in {1..30}; do
        if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping >/dev/null 2>&1; then
            print_success "Redis is healthy"
            break
        fi
        sleep 2
        if [ $i -eq 30 ]; then
            print_error "Redis failed to start"
            exit 1
        fi
    done
    
    # Wait for application
    print_status "Checking application health..."
    for i in {1..60}; do
        if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
            print_success "Application is healthy"
            break
        fi
        sleep 5
        if [ $i -eq 60 ]; then
            print_error "Application failed to start"
            exit 1
        fi
    done
}

# Run post-deployment checks
post_deployment_checks() {
    print_status "Running post-deployment checks..."
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    health_response=$(curl -s http://localhost:3000/api/health)
    if echo "$health_response" | grep -q '"status":"healthy"'; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        echo "$health_response"
        exit 1
    fi
    
    # Test dashboard API
    print_status "Testing dashboard API..."
    if curl -f -s http://localhost:3000/api/admin/dashboard/stats >/dev/null; then
        print_success "Dashboard API is working"
    else
        print_error "Dashboard API test failed"
        exit 1
    fi
    
    # Test Redis caching
    print_status "Testing Redis caching..."
    redis_status=$(echo "$health_response" | grep -o '"redisConnected":[^,]*' | cut -d':' -f2)
    if [ "$redis_status" = "true" ]; then
        print_success "Redis caching is active"
    else
        print_warning "Redis caching might not be working properly"
    fi
}

# Display deployment information
show_deployment_info() {
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "====================================="
    echo ""
    echo "📋 Deployment Information:"
    echo "  Application URL: http://localhost:3000"
    echo "  Health Check: http://localhost:3000/api/health"
    echo "  Admin Dashboard: http://localhost:3000/admin"
    echo ""
    echo "📊 Services Status:"
    docker-compose -f docker-compose.prod.yml ps
    echo ""
    echo "📈 Performance Metrics:"
    curl -s http://localhost:3000/api/health | jq '.performance' 2>/dev/null || echo "Install jq for formatted output"
    echo ""
    echo "🔧 Useful Commands:"
    echo "  View logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "  Stop services: docker-compose -f docker-compose.prod.yml down"
    echo "  Restart services: docker-compose -f docker-compose.prod.yml restart"
    echo "  Redis CLI: docker-compose -f docker-compose.prod.yml exec redis redis-cli"
    echo ""
    echo "📚 For more deployment options, see DEPLOYMENT_GUIDE.md"
}

# Main deployment flow
main() {
    print_status "Starting deployment process..."
    
    check_docker
    setup_environment
    deploy_docker
    wait_for_services
    post_deployment_checks
    show_deployment_info
    
    print_success "🚀 Financial Transfer Management System deployed successfully!"
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main 