#!/bin/bash

# Quick deployment script for backend services
# Usage: ./deploy-backend.sh <environment>
# Example: ./deploy-backend.sh dev

set -e

ENV=$1

if [ -z "$ENV" ]; then
    echo "Usage: ./deploy-backend.sh <environment>"
    echo "Example: ./deploy-backend.sh dev"
    exit 1
fi

if [ "$ENV" != "dev" ] && [ "$ENV" != "qa" ] && [ "$ENV" != "prod" ]; then
    echo "Error: Environment must be dev, qa, or prod"
    exit 1
fi

echo "================================================"
echo "Deploying Backend Services to $ENV"
echo "================================================"

# Set ACR and resource names based on environment
if [ "$ENV" == "dev" ]; then
    ACR_NAME="gopaldevacr"
    RG_NAME="rg-gopal-dev"
    AKS_NAME="aks-gopal-dev"
elif [ "$ENV" == "qa" ]; then
    ACR_NAME="gopalqaacr"
    RG_NAME="rg-gopal-qa"
    AKS_NAME="aks-gopal-qa"
else
    ACR_NAME="gopalprodacr"
    RG_NAME="rg-gopal-prod"
    AKS_NAME="aks-gopal-prod"
fi

echo "Step 1/4: Logging into ACR..."
az acr login --name $ACR_NAME

echo "Step 2/4: Building and pushing backend-a..."
az acr build --registry $ACR_NAME --image backend-a:$ENV --file backend-a/Dockerfile backend-a/

echo "Step 3/4: Building and pushing backend-b..."
az acr build --registry $ACR_NAME --image backend-b:$ENV --file backend-b/Dockerfile backend-b/

echo "Step 4/4: Deploying to AKS..."
az aks get-credentials --resource-group $RG_NAME --name $AKS_NAME --overwrite-existing
kubectl apply -f k8s/$ENV/

echo ""
echo "================================================"
echo "Deployment Complete!"
echo "================================================"
echo ""
echo "Verifying deployment..."
kubectl get pods -n gopal-app-$ENV
echo ""
kubectl get services -n gopal-app-$ENV
echo ""
echo "Get LoadBalancer IP:"
echo "kubectl get service gopal-api-gateway -n gopal-app-$ENV"
