#!/bin/bash

# TraderPlus Editor Deployment Script
# Usage: ./deploy.sh <ssh_user> <ssh_host> <deploy_path>
# Example: ./deploy.sh user example.com /var/www/traderpluseditor

# Check if all arguments are provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <ssh_user> <ssh_host> <deploy_path>"
    exit 1
fi

SSH_USER=$1
SSH_HOST=$2
DEPLOY_PATH=$3

echo "Building application for production..."
npm run build -- --configuration=production

if [ $? -ne 0 ]; then
    echo "Build failed. Aborting deployment."
    exit 1
fi

echo "Deploying to $SSH_USER@$SSH_HOST:$DEPLOY_PATH..."
rsync -avz --delete dist/ $SSH_USER@$SSH_HOST:$DEPLOY_PATH

if [ $? -ne 0 ]; then
    echo "Deployment failed."
    exit 1
fi

echo "Deployment completed successfully!"
exit 0
