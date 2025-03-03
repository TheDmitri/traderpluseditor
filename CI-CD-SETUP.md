# CI/CD Setup Guide for TraderPlus Editor

This guide explains how to set up the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the TraderPlus Editor application.

## Overview

The CI/CD pipeline performs the following tasks:
1. Runs linting checks on the codebase
2. Builds the Angular application for production
3. Deploys the built application to a VPS via SSH

## GitHub Secrets Setup

To enable the deployment to your VPS, you need to add the following secrets to your GitHub repository:

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add the following secrets:

| Secret Name | Description |
|-------------|-------------|
| `SSH_PRIVATE_KEY` | Your private SSH key (the content of your `id_rsa` file) |
| `SSH_KNOWN_HOSTS` | The known hosts entry for your VPS (run `ssh-keyscan -H your-vps-ip` to get this) |
| `SSH_USER` | The username to use when connecting to your VPS |
| `SSH_HOST` | The hostname or IP address of your VPS |
| `DEPLOY_PATH` | The path on your VPS where the application should be deployed (e.g., `/var/www/traderpluseditor`) |

## VPS Server Setup

### Prerequisites

1. A VPS with SSH access
2. Caddy web server installed
3. Node.js and npm (optional, only needed if you want to run server-side components)

### Caddy Configuration

Caddy is a modern, easy-to-configure web server that automatically handles HTTPS certificates. Here's how to set it up for your Angular application:

1. Install Caddy on your VPS (if not already installed):

```bash
# For Debian/Ubuntu
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# For RHEL/CentOS
sudo dnf install 'dnf-command(copr)'
sudo dnf copr enable @caddy/caddy
sudo dnf install caddy
```

2. Create or edit your Caddyfile:

```bash
sudo nano /etc/caddy/Caddyfile
```

3. Add the following configuration:

```
your-domain.com {
    root * /var/www/traderpluseditor
    file_server
    try_files {path} /index.html
    
    # Add headers for caching static assets
    @static {
        path *.js *.css *.png *.jpg *.jpeg *.gif *.ico *.svg
    }
    header @static Cache-Control "public, max-age=2592000"
    
    # Enable compression
    encode gzip
    
    # Enable logging
    log {
        output file /var/log/caddy/traderpluseditor.log
    }
}
```

4. Create the log directory:

```bash
sudo mkdir -p /var/log/caddy
```

5. Reload Caddy to apply the changes:

```bash
sudo systemctl reload caddy
```

6. Make sure the deployment directory exists and has the right permissions:

```bash
sudo mkdir -p /var/www/traderpluseditor
sudo chown -R $USER:$USER /var/www/traderpluseditor
```

### Testing Your Caddy Configuration

You can test your Caddy configuration with:

```bash
caddy validate --config /etc/caddy/Caddyfile
```

## Manual Triggering

You can manually trigger the CI/CD pipeline by:
1. Going to your GitHub repository
2. Clicking on the "Actions" tab
3. Selecting the "CI/CD Pipeline" workflow
4. Clicking on "Run workflow"

## Troubleshooting

### SSH Connection Issues

If the deployment fails due to SSH connection issues:

1. Verify that your SSH key is correctly added to the GitHub secrets
2. Make sure the SSH key is added to the `authorized_keys` file on your VPS
3. Check that the known hosts entry is correct
4. Ensure the SSH user has write permissions to the deployment directory

### Build Failures

If the build step fails:

1. Check the build logs for specific errors
2. Try running the build locally with `npm run build --configuration=production`
3. Ensure all dependencies are correctly installed

### Caddy Issues

If you encounter issues with Caddy:

1. Check Caddy logs: `sudo journalctl -u caddy`
2. Validate your Caddyfile: `caddy validate --config /etc/caddy/Caddyfile`
3. Ensure the deployment directory exists and has proper permissions
4. Check that port 80/443 are not being used by another service
