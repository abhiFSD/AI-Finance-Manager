#!/bin/bash

# Production Deployment Script for Finance App
# Usage: ./scripts/deploy.sh [environment]
# Environment: production, staging, or development

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-production}
APP_NAME="finance-app"
DOCKER_REGISTRY="your-registry.com"
DOCKER_TAG=${GITHUB_SHA:-$(git rev-parse HEAD)}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f ".env.${ENVIRONMENT}" ]; then
        log_error "Environment file .env.${ENVIRONMENT} not found"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Build and tag Docker image
build_image() {
    log_info "Building Docker image..."
    
    docker build \
        --build-arg NODE_ENV=${ENVIRONMENT} \
        --build-arg APP_VERSION=${DOCKER_TAG} \
        -t ${APP_NAME}:${DOCKER_TAG} \
        -t ${APP_NAME}:latest \
        .
    
    log_info "Docker image built successfully"
}

# Run security scan
security_scan() {
    log_info "Running security scan..."
    
    # Use Trivy for vulnerability scanning
    if command -v trivy >/dev/null 2>&1; then
        trivy image ${APP_NAME}:${DOCKER_TAG}
    else
        log_warn "Trivy not found, skipping security scan"
    fi
}

# Run performance tests
performance_test() {
    log_info "Running performance tests..."
    
    # Start services for testing
    docker-compose -f docker-compose.test.yml up -d
    
    # Wait for services to be ready
    sleep 30
    
    # Run Lighthouse CI
    if command -v lhci >/dev/null 2>&1; then
        lhci autorun --upload.target=temporary-public-storage
    else
        log_warn "Lighthouse CI not found, skipping performance tests"
    fi
    
    # Run load tests with k6
    if command -v k6 >/dev/null 2>&1; then
        k6 run tests/load/load-test.js
    else
        log_warn "k6 not found, skipping load tests"
    fi
    
    # Cleanup test environment
    docker-compose -f docker-compose.test.yml down
}

# Database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Create migration container
    docker run --rm \
        --network finance-app_app-network \
        -e DATABASE_URL=${DATABASE_URL} \
        ${APP_NAME}:${DOCKER_TAG} \
        npm run db:migrate
    
    log_info "Database migrations completed"
}

# Deploy to environment
deploy() {
    log_info "Deploying to ${ENVIRONMENT}..."
    
    # Copy environment file
    cp .env.${ENVIRONMENT} .env
    
    # Pull latest images for dependencies
    docker-compose pull postgres redis nginx prometheus grafana elasticsearch
    
    # Deploy with zero downtime
    if [ "${ENVIRONMENT}" = "production" ]; then
        # Blue-green deployment
        log_info "Starting blue-green deployment..."
        
        # Start new containers
        docker-compose up -d --scale app=2 --no-recreate postgres redis nginx
        
        # Wait for new containers to be healthy
        sleep 60
        
        # Update app containers
        docker-compose up -d app
        
        # Health check
        if ! health_check; then
            log_error "Health check failed, rolling back..."
            rollback
            exit 1
        fi
        
        # Remove old containers
        docker system prune -f
        
    else
        # Simple deployment for staging/dev
        docker-compose up -d
    fi
    
    log_info "Deployment completed successfully"
}

# Health check
health_check() {
    log_info "Running health check..."
    
    local retries=10
    local wait=5
    
    for i in $(seq 1 $retries); do
        if curl -f http://localhost/api/health >/dev/null 2>&1; then
            log_info "Health check passed"
            return 0
        fi
        
        log_warn "Health check attempt $i failed, waiting ${wait}s..."
        sleep $wait
    done
    
    log_error "Health check failed after $retries attempts"
    return 1
}

# Rollback function
rollback() {
    log_warn "Rolling back deployment..."
    
    # Get previous image tag
    local previous_tag=$(docker images ${APP_NAME} --format "table {{.Tag}}" | sed -n '2p')
    
    if [ ! -z "$previous_tag" ]; then
        log_info "Rolling back to ${APP_NAME}:${previous_tag}"
        
        # Update docker-compose to use previous image
        sed -i "s/${DOCKER_TAG}/${previous_tag}/g" docker-compose.yml
        
        # Restart services
        docker-compose up -d app
        
        log_info "Rollback completed"
    else
        log_error "No previous version found for rollback"
    fi
}

# Cleanup old images and containers
cleanup() {
    log_info "Cleaning up..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old images (keep last 3)
    docker images ${APP_NAME} --format "table {{.ID}} {{.Tag}}" | \
        tail -n +4 | \
        awk '{print $1}' | \
        xargs -r docker rmi
    
    log_info "Cleanup completed"
}

# Send deployment notification
send_notification() {
    local status=$1
    local message="Finance App deployment to ${ENVIRONMENT}: ${status}"
    
    # Slack notification (if webhook URL is set)
    if [ ! -z "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${message}\"}" \
            ${SLACK_WEBHOOK_URL}
    fi
    
    # Email notification (if configured)
    if command -v sendmail >/dev/null 2>&1; then
        echo "Subject: Deployment Notification" | sendmail ${NOTIFICATION_EMAIL}
        echo "${message}" | sendmail ${NOTIFICATION_EMAIL}
    fi
}

# Main deployment process
main() {
    log_info "Starting deployment process for ${ENVIRONMENT}..."
    
    # Load environment variables
    set -a  # automatically export all variables
    source .env.${ENVIRONMENT}
    set +a
    
    check_prerequisites
    build_image
    
    if [ "${ENVIRONMENT}" = "production" ]; then
        security_scan
        performance_test
    fi
    
    run_migrations
    deploy
    
    if health_check; then
        log_info "Deployment successful!"
        send_notification "SUCCESS"
        cleanup
    else
        log_error "Deployment failed!"
        send_notification "FAILED"
        rollback
        exit 1
    fi
}

# Error handling
trap 'log_error "Deployment script failed at line $LINENO"' ERR

# Run main function
main "$@"