# Capstone Backend Services

Node.js microservices for handling image uploads.

## Services

- **backend-a**: Processes uploads via `/api/a`
- **backend-b**: Processes uploads via `/api/b`

## Database

PostgreSQL schema in `db/init.sql`

## Kubernetes Manifests

Environment-specific K8s configurations in `k8s/{dev,qa,prod}/`

## Local Development

```bash
cd backend-a
npm install
npm start
```
