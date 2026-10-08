# Frontend Deployment to EC2 (Staging)

This repository uses **GitHub Actions** to automatically build and deploy the `coylejax-frontend` application to an **AWS EC2 instance** whenever changes push or merge to the 'staging' branch.

The workflow builds the project, syncs the generated `dist/` folder to the EC2 server, and reloads **Nginx** so the latest version is served immediately.

---

## Environment Type

**Staging (Demo)**

This workflow deploys code directly to the Staging environment. Changes will immediately affect end users.

---

## Workflow Trigger

The deployment workflow runs in the following situations:

* **Automatic trigger**: On every push or merge to the `staging` branch
* **Manual trigger**: From the GitHub Actions UI using **Run workflow**

---

## Workflow Overview

The deployment process consists of the following steps:

1. Checkout the latest source code
2. Install Node.js dependencies
3. Build the frontend for the staging environment
4. Configure self-hosted runner for communicate with ec2 machine
5. Move the `dist/` folder
6. Reload Nginx on the EC2 server

---

## Build Step

The workflow installs dependencies and runs the staging build command:

```bash
npm install
npm run build:staging
```

This command generates a production-ready build in the `dist/` directory.

---

## Build Artifact Transfer

The `dist/` folder is transferred between jobs using GitHub Actions artifacts:

- Uploaded in the build job  
- Downloaded in the deploy job  
- Retained for 1 day only

---

## EC2 Directory Structure

The frontend build is deployed to:

```
/home/ubuntu/staging/coylejax-frontend/dist/
```

Ensure that:

* The directory exists
* The EC2 user has read/write permissions
* Nginx is configured to serve this directory

---

## Nginx Reload

After deployment, Nginx is reloaded on the EC2 server:

```bash
sudo systemctl reload nginx
```

Reloading applies the new files without interrupting active connections, ensuring zero downtime.

---

## Summary

* Automated **Staging frontend deployment** using GitHub Actions
* Secure EC2 access via github self-host-runner 
* Efficient and clean file system with `self-hosted-runner`
* Zero-downtime updates through Nginx reload 
 
---

**Maintained by:** BrightUI DevOps Teams