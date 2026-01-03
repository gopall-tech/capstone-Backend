# Capstone Backend Services

This repository contains the backend microservices for the capstone project.

## What's in This Repo

This repo contains two Node.js backend services that handle image uploads and store data in PostgreSQL:

- **backend-a**: Processes uploads via `/api/a` endpoint
- **backend-b**: Processes uploads via `/api/b` endpoint
- **CI/CD Pipeline**: GitHub Actions workflow for automated deployment

Both services are containerized and deployed to Azure Kubernetes Service (AKS) across dev, qa, and prod environments.

## Repository Structure

```
capstone-Backend/
├── backend-a/
│   ├── index.js              # Express API server
│   ├── package.json          # Node dependencies
│   ├── Dockerfile            # Container image build
│   └── uploads/              # File upload directory
├── backend-b/
│   ├── index.js              # Express API server
│   ├── package.json          # Node dependencies
│   ├── Dockerfile            # Container image build
│   └── uploads/              # File upload directory
├── db/
│   └── init.sql              # PostgreSQL schema
├── k8s/                      # Legacy K8s configs (moved to terraform repo)
└── .github/
    └── workflows/
        └── deploy.yml        # Automated CI/CD pipeline
```

## How This Fits in the Overall Project

This is **1 of 3 repositories** that make up the complete capstone project:

### 1. [capstone-Backend](https://github.com/gopall-tech/capstone-Backend) (THIS REPO)
**What it contains**: Backend microservices (Node.js/Express)
- Two REST API services (backend-a and backend-b)
- File upload handling
- PostgreSQL database integration
- Dockerfiles for containerization
- GitHub Actions CI/CD workflow

### 2. [capstone-Frontend](https://github.com/gopall-tech/capstone-Frontend)
**What it contains**: Frontend web application (React)
- User interface for uploading files
- Calls backend-a and backend-b APIs
- Environment-specific nginx configurations
- GitHub Actions CI/CD workflow

### 3. [capstone-terraform](https://github.com/gopall-tech/capstone-terraform)
**What it contains**: Infrastructure as Code and deployment configs
- Terraform modules for Azure resources (AKS, ACR, PostgreSQL, APIM)
- Kubernetes deployment manifests for all services
- Environment configurations (dev, qa, prod)
- Deployment scripts and utilities

**How they connect**:
```
┌──────────────────┐
│  Frontend Repo   │ ← User uploads files here
│   (React App)    │
└────────┬─────────┘
         │ HTTP Requests
         ▼
┌──────────────────┐
│      APIM        │ ← API Gateway - THE ONLY WAY to access backends
│  (Azure API Mgmt)│    (rate limiting, authentication, policies)
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Backend │ │Backend │ ← THIS REPO (Node.js APIs)
│   A    │ │   B    │    Running in AKS (K8s)
└───┬────┘ └───┬────┘
    │          │
    └────┬─────┘
         │
         ▼
    ┌────────┐
    │PostgreSQL│ ← Shared Database (provisioned by terraform repo)
    └──────────┘
```

## Backend Services Explained

### Backend A (`/api/a`)
- **Port**: 3000
- **Endpoints**:
  - `GET /api/a/` - Returns all stored records
  - `POST /api/a/` - Upload file and save metadata
- **Database**: gopalappdev/qa/prod
- **Container**: Deployed to `backend-a` deployment in K8s

### Backend B (`/api/b`)
- **Port**: 3000
- **Endpoints**:
  - `GET /api/b/` - Returns all stored records
  - `POST /api/b/` - Upload file and save metadata
- **Database**: gopalappdev/qa/prod (shared database)
- **Container**: Deployed to `backend-b` deployment in K8s

## CI/CD Pipeline (`.github/workflows/deploy.yml`)

This workflow automatically builds and deploys both backend services:

**What happens when you push code:**

1. **Build Job**:
   - Builds Docker images for both backend-a and backend-b
   - Pushes images to dev ACR (Azure Container Registry)
   - Tags: `dev-{commit-sha}` and `dev-latest`

2. **Deploy-Dev Job**:
   - Automatically deploys to dev AKS cluster
   - Updates deployments with new images
   - No approval needed

3. **Promote-to-QA Job**:
   - **⏸ Waits for manual approval**
   - Pulls images from dev ACR
   - Retags and pushes to QA ACR
   - Deploys to QA AKS cluster

4. **Promote-to-Prod Job**:
   - **⏸ Waits for manual approval**
   - Pulls images from QA ACR
   - Retags and pushes to Prod ACR
   - Deploys to Prod AKS cluster

**Required GitHub Secrets:**
- `AZURE_CREDENTIALS` - Service Principal for Azure access
- `POSTGRES_ADMIN_PASSWORD` - Database password

## Current Deployment Status

### ✅ Dev Environment
- **URL**: http://20.28.60.126
- **Backend A**: http://20.28.60.126/api/a/
- **Backend B**: http://20.28.60.126/api/b/
- **Status**: Fully operational, database connected

### ✅ QA Environment
- **URL**: http://20.28.46.94
- **Backend A**: http://20.28.46.94/api/a/
- **Backend B**: http://20.28.46.94/api/b/
- **Status**: Fully operational, database connected

### ✅ Prod Environment
- **URL**: http://20.53.16.223
- **Backend A**: http://20.53.16.223/api/a/
- **Backend B**: http://20.53.16.223/api/b/
- **Status**: Fully operational, database connected

## Environment Configuration

Each backend service uses these environment variables (set in K8s deployments):

```bash
PORT=3000
SERVICE_NAME=backend-a  # or backend-b
DB_HOST=gopalpgdev.postgres.database.azure.com  # per environment
DB_PORT=5432
DB_NAME=gopalappdev  # per environment
DB_USER=gopalpgadmindev  # per environment
DB_PASSWORD=<from-secret>
DB_SSL=require
```

## Local Development

### Run Backend A Locally
```bash
cd backend-a
npm install

# Set environment variables
export DB_HOST=gopalpgdev.postgres.database.azure.com
export DB_USER=gopalpgadmindev
export DB_PASSWORD=P@ssw0rd123!
export DB_NAME=gopalappdev
export DB_SSL=require

npm start
# Server runs on http://localhost:3000
```

### Test Locally
```bash
# Test GET
curl http://localhost:3000/api/a/

# Test POST with file upload
curl -X POST http://localhost:3000/api/a/ \
  -F "file=@test-image.jpg"
```

## Database Schema

Both backends share this PostgreSQL table:

```sql
CREATE TABLE data (
    id SERIAL PRIMARY KEY,
    backend_name VARCHAR(50),
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    meta JSONB
);
```

## Monitoring & Troubleshooting

### View Logs
```bash
# Switch to environment
az aks get-credentials --resource-group rg-gopal-dev --name aks-gopal-dev

# View logs
kubectl logs -f -n gopal-app -l app=backend-a
kubectl logs -f -n gopal-app -l app=backend-b
```

### Check Status
```bash
# Check pods
kubectl get pods -n gopal-app

# Check deployments
kubectl get deployments -n gopal-app

# Describe pod for details
kubectl describe pod <pod-name> -n gopal-app
```

### Restart Service
```bash
kubectl rollout restart deployment/backend-a -n gopal-app
kubectl rollout restart deployment/backend-b -n gopal-app
```

## Making Changes

1. **Make code changes** to backend-a or backend-b
2. **Commit and push** to `main` branch
   ```bash
   git add .
   git commit -m "Your message"
   git push origin main
   ```
3. **Automatic deployment** to dev happens immediately
4. **Go to GitHub Actions** tab to monitor progress
5. **Approve QA deployment** when ready (click "Review deployments")
6. **Approve Prod deployment** when ready

## Related Documentation

- **Infrastructure**: See [capstone-terraform](https://github.com/gopall-tech/capstone-terraform) for AKS, PostgreSQL, ACR setup
- **Frontend**: See [capstone-Frontend](https://github.com/gopall-tech/capstone-Frontend) for UI that calls these APIs
- **CI/CD Setup**: See `GITHUB_ACTIONS_SETUP.md` in terraform repo for complete pipeline documentation

## Container Images

Images are stored in Azure Container Registry:

### Dev
- `gopaldevacr.azurecr.io/backend-a:dev-latest`
- `gopaldevacr.azurecr.io/backend-b:dev-latest`

### QA
- `gopalqaacr.azurecr.io/backend-a:qa-latest`
- `gopalqaacr.azurecr.io/backend-b:qa-latest`

### Prod
- `gopalprodacr.azurecr.io/backend-a:prod-latest`
- `gopalprodacr.azurecr.io/backend-b:prod-latest`

## Support

- **Deployment issues**: Check GitHub Actions workflow logs
- **Infrastructure issues**: See [capstone-terraform](https://github.com/gopall-tech/capstone-terraform)
- **Database issues**: Check PostgreSQL firewall rules and credentials
