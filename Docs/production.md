# Frontend Deployment to EC2 (Production)

This repository uses **GitHub Actions** to deploy the `coylejax-frontend` application to the **live production EC2 server**. The workflow builds the frontend, uploads the generated `dist/` folder, and reloads **Nginx** to serve the latest production build.

This is a **production (live)** deployment and any change will be immediately visible to end users.

---

## Environment Type

**Production (Live)**

Deployments to this environment should only include tested and approved code.

---

## Workflow Trigger

The deployment workflow runs in the following cases:

* **Automatic trigger**: On every push to the `release/production-live` branch
* **Manual trigger**: Via the **Run workflow** option in GitHub Actions

---

## Workflow Overview

The production frontend deployment follows these steps:

1. Checkout the latest frontend source code
2. Install Node.js dependencies
3. Build the frontend dist/
4. Configure SSH access to the EC2 server
5. Upload the `dist/` folder using `rsync`
6. Reload Nginx to apply changes

---

## Build Step

The workflow installs dependencies and builds the frontend for production:

```bash
npm install
npm run build
```

This generates an optimized production build inside the `dist/` directory.

---

## SSH Configuration

SSH access is configured using the `webfactory/ssh-agent` GitHub Action. The EC2 private key is securely loaded from GitHub Secrets and used for all remote commands.

---

## Frontend Deployment Using rsync

The production `dist/` folder is uploaded to the EC2 server using `rsync`.

Key characteristics of this deployment:

* Only changed files are transferred
* File structure is preserved
* Old files on the server are removed

**Important:** The `--delete` remove the old `dist/` in target directory.



---

## Deployment Directory on EC2

The frontend build is deployed to:

```
/home/ubuntu/coylejax-frontend/dist/
```

Ensure that:

* The directory exists
* The EC2 user owns the directory
* Nginx is configured to serve this path









---

## Nginx Reload

After deployment, Nginx is reloaded to serve the new frontend build:

```bash
sudo systemctl reload nginx
```

Reloading Nginx applies the changes without stopping the service, ensuring **zero downtime** for users.

---



## Required GitHub Secrets

The following secrets must be configured in the GitHub repository:

| Secret Name   | Description                                      |
| ------------- | ------------------------------------------------ |
| `EC2_SSH_KEY` | Private SSH key for EC2 access on Github Secrets |
| `EC2_USER`    | EC2 login user on Github Secrets                 |
| `EC2_HOST`    | EC2 public IP on Github Actions                  |

---

## Summary

* Automated **production frontend deployment** using GitHub Actions
* Secure EC2 access via SSH keys
* Efficient and clean file synchronization with `rsync`
* Zero-downtime updates through Nginx reload


---
