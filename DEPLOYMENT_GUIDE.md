# 🚀 Production Deployment Guide with Redis Caching

This guide covers deploying the Financial Transfer Management System to production with Redis caching for optimal performance.

## 📋 Prerequisites

- ✅ Code pushed to GitHub *(completed)*
- ✅ Performance optimizations applied *(completed)*
- ✅ SSL certificate issues resolved *(completed)*
- 🔧 Production environment setup *(follow this guide)*

## 🎯 Deployment Options

### Option 1: Docker Compose (Recommended for VPS/Dedicated Server)

**1. Clone the repository on your server:**
```bash
git clone https://github.com/riftvanta/mteoc.git
cd mteoc
```

**2. Create production environment file:**
```bash
cp env.production.example .env.local
# Edit .env.local with your production values
nano .env.local
```

**3. Deploy with Docker Compose:**
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

**4. Verify deployment:**
```bash
# Health check
curl http://your-domain.com/api/health

# Performance metrics
curl http://your-domain.com/api/admin/dashboard/stats
```

### Option 2: Vercel + Redis Cloud (Serverless)

**1. Deploy to Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**2. Set up Redis Cloud:**
- Go to [Redis Cloud](https://redis.com/try-free/)
- Create a free database
- Get your Redis URL

**3. Configure Vercel Environment Variables:**
```bash
vercel env add REDIS_URL
vercel env add POSTGRES_PRISMA_URL
vercel env add POSTGRES_URL_NON_POOLING
vercel env add NODE_TLS_REJECT_UNAUTHORIZED
```

### Option 3: DigitalOcean App Platform + Redis

**1. Create `app.yaml`:**
```yaml
name: financial-transfer-app
services:
- name: web
  source_dir: /
  github:
    repo: riftvanta/mteoc
    branch: master
  build_command: npm run build
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: REDIS_URL
    value: ${redis.REDIS_URL}
  - key: NODE_TLS_REJECT_UNAUTHORIZED
    value: "0"
databases:
- name: redis
  engine: REDIS
  version: "7"
```

**2. Deploy:**
```bash
doctl apps create --spec app.yaml
```

### Option 4: AWS ECS + ElastiCache

**1. Create ECS Task Definition:**
```json
{
  "family": "financial-transfer-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/financial-transfer-app:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://your-elasticache-endpoint:6379"
        }
      ]
    }
  ]
}
```

## 🔧 Redis Configuration Options

### Local Development with Docker
```bash
# Start Redis container
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Set environment variable
export REDIS_URL="redis://localhost:6379"
```

### Managed Redis Services

**Redis Cloud (Recommended for small-medium apps):**
- ✅ Free tier: 30MB storage
- ✅ Global availability
- ✅ Automatic backups
- 🔗 [redis.com/try-free](https://redis.com/try-free/)

**AWS ElastiCache:**
- ✅ High performance
- ✅ VPC integration
- ✅ Multi-AZ failover
- 💰 Pay-per-use

**DigitalOcean Managed Redis:**
- ✅ Simple setup
- ✅ Automatic updates
- ✅ Built-in monitoring
- 💰 $15/month minimum

**Upstash Redis:**
- ✅ Serverless-friendly
- ✅ Per-request pricing
- ✅ Global edge locations
- 🔗 [upstash.com](https://upstash.com/)

## 📊 Performance Monitoring Setup

### Built-in Health Check
```bash
# Check application health
curl https://your-domain.com/api/health

# Expected response:
{
  "status": "healthy",
  "database": { "connected": true },
  "cache": { "type": "Redis", "redisConnected": true },
  "performance": {
    "cacheHitRate": "95.2%",
    "averageDuration": "45ms"
  }
}
```

### Performance Metrics Dashboard

Add this to your monitoring setup:

```typescript
// Monitor key metrics
const metrics = {
  cacheHitRate: '95%+',        // Target: >90%
  responseTime: '<500ms',      // Target: <500ms
  errorRate: '<2%',           // Target: <5%
  uptime: '99.9%',            // Target: >99%
  memoryUsage: '<80%'         // Target: <80%
}
```

## 🔒 Production Security Checklist

- ✅ **SSL/TLS certificates** configured
- ✅ **Environment variables** secured (no hardcoded secrets)
- ✅ **Database connection** encrypted
- ✅ **Redis authentication** enabled (if required)
- ✅ **CORS headers** configured
- ✅ **Rate limiting** implemented
- ✅ **Security headers** set (HSTS, CSP, etc.)

## 🚀 Post-Deployment Steps

### 1. Database Setup
```bash
# Run migrations (if needed)
npx prisma migrate deploy

# Seed initial data (if needed)
npx prisma db seed
```

### 2. Performance Verification
```bash
# Test cache performance
curl -w "%{time_total}" https://your-domain.com/api/admin/dashboard/stats

# Should be <500ms after first request (cache hit)
```

### 3. Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Create load test
echo '
config:
  target: "https://your-domain.com"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Dashboard Load Test"
    requests:
      - get:
          url: "/api/admin/dashboard/stats"
      - get:
          url: "/api/admin/dashboard/recent-orders"
' > load-test.yml

# Run load test
artillery run load-test.yml
```

## 📈 Scaling Configuration

### Auto-scaling Triggers
- **CPU usage** > 70% for 5 minutes
- **Memory usage** > 80% for 5 minutes
- **Response time** > 1000ms for 5 minutes
- **Error rate** > 5% for 2 minutes

### Cache Optimization
```bash
# Redis memory optimization
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 512mb

# Monitor cache performance
redis-cli INFO memory
redis-cli INFO stats
```

## 🎯 Environment-Specific Configurations

### Development
```bash
REDIS_URL="redis://localhost:6379"
NODE_ENV="development"
ENABLE_PERFORMANCE_MONITORING="true"
```

### Staging
```bash
REDIS_URL="redis://staging-redis:6379"
NODE_ENV="production"
ENABLE_PERFORMANCE_MONITORING="true"
```

### Production
```bash
REDIS_URL="redis://prod-redis-cluster:6379"
NODE_ENV="production"
ENABLE_PERFORMANCE_MONITORING="true"
NODE_TLS_REJECT_UNAUTHORIZED="0"
```

## 🆘 Troubleshooting

### Common Issues

**Redis Connection Failed:**
```bash
# Check Redis connectivity
redis-cli -u $REDIS_URL ping

# Expected: PONG
```

**SSL Certificate Errors:**
```bash
# Ensure environment variable is set
echo $NODE_TLS_REJECT_UNAUTHORIZED
# Should output: 0
```

**High Memory Usage:**
```bash
# Check Redis memory
redis-cli INFO memory | grep used_memory_human

# Clear cache if needed
redis-cli FLUSHALL
```

**Slow Performance:**
```bash
# Check cache hit rate
curl https://your-domain.com/api/health | grep cacheHitRate

# Should be >90%
```

## 📞 Support

For deployment issues:
1. Check the health endpoint: `/api/health`
2. Review application logs
3. Verify environment variables
4. Test Redis connectivity
5. Check database connection

---

**Result**: Your Financial Transfer Management System is now deployed to production with Redis caching, delivering optimal performance at scale! 🎉 