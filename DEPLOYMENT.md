# Backend Services Deployment Guide

## Prerequisites

1. Terraform infrastructure deployed (AKS, ACR, PostgreSQL)
2. kubectl installed and configured
3. Azure CLI logged in
4. Database initialized with `db/init.sql`

## Option 1: Manual Deployment (Recommended for First Time)

### Step 1: Update Database Credentials

Edit the Kubernetes secrets for each environment with your actual PostgreSQL passwords:

**Dev:**
```bash
# Edit k8s/dev/01-secrets.yaml
# Replace "REPLACE_WITH_SECURE_PASSWORD" with your actual password
```

**QA and Prod:**
```bash
# Edit k8s/qa/01-secrets.yaml
# Edit k8s/prod/01-secrets.yaml
```

### Step 2: Build and Push Docker Images to ACR

**Dev Environment:**
```bash
# Login to ACR
az acr login --name gopaldevacr

# Build and push backend-a
az acr build --registry gopaldevacr --image backend-a:dev --file backend-a/Dockerfile backend-a/

# Build and push backend-b
az acr build --registry gopaldevacr --image backend-b:dev --file backend-b/Dockerfile backend-b/
```

**QA Environment:**
```bash
az acr login --name gopalqaacr
az acr build --registry gopalqaacr --image backend-a:qa --file backend-a/Dockerfile backend-a/
az acr build --registry gopalqaacr --image backend-b:qa --file backend-b/Dockerfile backend-b/
```

**Prod Environment:**
```bash
az acr login --name gopalprodacr
az acr build --registry gopalprodacr --image backend-a:prod --file backend-a/Dockerfile backend-a/
az acr build --registry gopalprodacr --image backend-b:prod --file backend-b/Dockerfile backend-b/
```

### Step 3: Deploy to Kubernetes

**Dev Environment:**
```bash
# Get AKS credentials
az aks get-credentials --resource-group rg-gopal-dev --name aks-gopal-dev --overwrite-existing

# Deploy all manifests
kubectl apply -f k8s/dev/

# Verify deployment
kubectl get pods -n gopal-app-dev
kubectl get services -n gopal-app-dev
```

**QA Environment:**
```bash
az aks get-credentials --resource-group rg-gopal-qa --name aks-gopal-qa --overwrite-existing
kubectl apply -f k8s/qa/
kubectl get pods -n gopal-app-qa
```

**Prod Environment:**
```bash
az aks get-credentials --resource-group rg-gopal-prod --name aks-gopal-prod --overwrite-existing
kubectl apply -f k8s/prod/
kubectl get pods -n gopal-app-prod
```

### Step 4: Get API Gateway LoadBalancer IP

```bash
# Dev
kubectl get service gopal-api-gateway -n gopal-app-dev

# Look for EXTERNAL-IP (may take a few minutes)
```

**Save this IP** - you'll need it for APIM configuration.

### Step 5: Configure APIM Backends

For each environment, configure APIM to route to the AKS LoadBalancer:

1. Go to Azure Portal → API Management → `apim-gopal-dev`
2. Click **Backends** → **+ Add**
3. Configure:
   - **Name:** `aks-backend-dev`
   - **Type:** HTTP(s)
   - **Runtime URL:** `http://<LOADBALANCER_IP>`
4. Click **Backends** → **APIs** → **+ Add API** → **HTTP**
5. Add these operations:
   - **POST** `/api/a` → Backend: `aks-backend-dev`
   - **POST** `/api/b` → Backend: `aks-backend-dev`

Repeat for QA and Prod.

## Option 2: Azure DevOps Pipeline Deployment

### Step 1: Create Azure DevOps Project

1. Go to https://dev.azure.com
2. Create new project: `gopal-capstone`

### Step 2: Create Service Connection

1. Project Settings → Service connections → New service connection
2. Select **Azure Resource Manager** → **Service principal (manual)**
3. Fill in your Azure subscription details
4. Name it: `sc-azure-gopal`
5. Grant access to all pipelines

### Step 3: Create Environments for Approval Gates

1. Pipelines → Environments → New environment
2. Create these environments:
   - `QA-Backend`
   - `Prod-Backend`
3. For each environment:
   - Click environment → ⋯ → Approvals and checks
   - Add **Approvals**
   - Add yourself as approver

### Step 4: Create Pipeline

1. Pipelines → New pipeline
2. Select **GitHub**
3. Select repository: `gopall-tech/capstone-Backend`
4. Select **Existing Azure Pipelines YAML file**
5. Path: `/pipelines/azure-pipelines-backend.yml`
6. Save and run

### Step 5: Update Kubernetes Secrets via Azure Key Vault (Optional but Recommended)

Instead of storing passwords in K8s secrets, use Azure Key Vault:

```bash
# Create Key Vault
az keyvault create --name kv-gopal-dev --resource-group rg-gopal-dev --location australiacentral

# Store database password
az keyvault secret set --vault-name kv-gopal-dev --name db-password --value "YourSecurePassword123!"

# Grant AKS access to Key Vault
# (Requires additional configuration with Secrets Store CSI Driver)
```

## Testing the Backend

### Test Backend-A Directly

```bash
# Get LoadBalancer IP
GATEWAY_IP=$(kubectl get service gopal-api-gateway -n gopal-app-dev -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Upload test image
curl -X POST http://$GATEWAY_IP/api/a \
  -F "image=@test-image.jpg"
```

### Test Backend-B

```bash
curl -X POST http://$GATEWAY_IP/api/b \
  -F "image=@test-image.jpg"
```

### Check Logs

```bash
# Backend-A logs
kubectl logs -n gopal-app-dev -l app=gopal-backend-a --tail=50

# Backend-B logs
kubectl logs -n gopal-app-dev -l app=gopal-backend-b --tail=50
```

## Troubleshooting

### Pods not starting

```bash
kubectl describe pod <pod-name> -n gopal-app-dev
```

Common issues:
- **ImagePullBackOff:** ACR credentials not configured (check AKS-ACR integration)
- **CrashLoopBackOff:** Database connection failed (check secrets and firewall rules)

### Database connection failed

1. Verify PostgreSQL firewall allows Azure services:
```bash
az postgres flexible-server firewall-rule show \
  --resource-group rg-gopal-dev \
  --name gopalpgdev \
  --rule-name allow-azure-services
```

2. Test connection from local machine:
```bash
psql "host=gopalpgdev.postgres.database.azure.com port=5432 dbname=gopalappdev user=gopalpgadmindev sslmode=require"
```

### LoadBalancer IP stuck in "Pending"

Wait 2-5 minutes. If still pending, check AKS networking configuration.

## Scaling

### Manual Scaling

```bash
kubectl scale deployment gopal-backend-a --replicas=3 -n gopal-app-dev
```

### Auto-scaling (HPA already configured)

The HPA manifests are already deployed. They will automatically scale pods based on CPU usage (60% threshold).

Check HPA status:
```bash
kubectl get hpa -n gopal-app-dev
```
