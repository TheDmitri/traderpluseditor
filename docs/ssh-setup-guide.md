# SSH Setup Guide for GitHub Actions Deployment

This guide will walk you through setting up SSH keys for deploying your application to a VPS using GitHub Actions.

## Step 1: Generate an SSH Key Pair

First, you need to generate an SSH key pair. This should be done on your local machine, not on the server.

```bash
# Generate a new SSH key pair (use a strong passphrase)
ssh-keygen -t ed25519 -C "github-actions-deploy"
```

This will create two files:
- `~/.ssh/id_ed25519` (private key)
- `~/.ssh/id_ed25519.pub` (public key)

## Step 2: Add the Public Key to Your VPS

You need to add the public key to the `~/.ssh/authorized_keys` file on your VPS:

```bash
# Display your public key
cat ~/.ssh/id_ed25519.pub

# Copy the output and add it to your VPS's authorized_keys file
# On your VPS:
echo "your-public-key-here" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Alternatively, you can use the `ssh-copy-id` command:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519 user@your-vps-hostname
```

## Step 3: Get the SSH Known Hosts Entry

To avoid SSH host verification prompts, you need to add your VPS to the known hosts:

```bash
# Get the SSH known hosts entry for your VPS
ssh-keyscan -H your-vps-hostname-or-ip
```

Copy the output of this command.

## Step 4: Add GitHub Secrets

Go to your GitHub repository and add the following secrets:

1. `SSH_PRIVATE_KEY`: The content of your private key file (~/.ssh/id_ed25519)
   - Make sure to include the entire file, including the BEGIN and END lines

2. `SSH_KNOWN_HOSTS`: The output from the ssh-keyscan command

3. `SSH_USER`: Your SSH username for the VPS

4. `SSH_HOST`: Your VPS hostname or IP address

5. `DEPLOY_PATH`: The path on your VPS where the application should be deployed

To add these secrets:
1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret" and add each of the secrets above

## Step 5: Test SSH Connection

Before relying on GitHub Actions, test your SSH connection locally:

```bash
# Test SSH connection
ssh -i ~/.ssh/id_ed25519 your-ssh-user@your-vps-hostname

# Test write permissions to the deploy path
touch your-deploy-path/test_file
rm your-deploy-path/test_file
```

You can also use the provided test script:

```bash
./test-ssh-connection.sh your-ssh-user your-vps-hostname your-deploy-path ~/.ssh/id_ed25519
```

## Troubleshooting SSH Issues

### Permission Denied Errors

If you see "Permission denied" errors:

1. Check that the private key is correctly formatted in the GitHub secret
   - It should include the BEGIN and END lines
   - There should be no extra spaces or line breaks

2. Verify that the public key is in the authorized_keys file on your VPS:
   ```bash
   cat ~/.ssh/authorized_keys
   ```

3. Check permissions on the server:
   ```bash
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

4. Check if your VPS allows public key authentication:
   ```bash
   # Edit SSH config
   sudo nano /etc/ssh/sshd_config
   
   # Make sure these lines are present and uncommented
   PubkeyAuthentication yes
   AuthorizedKeysFile .ssh/authorized_keys
   
   # Restart SSH service
   sudo systemctl restart sshd
   ```

### Connection Issues

If there are connection issues:

1. Check if your VPS has a firewall blocking SSH:
   ```bash
   # Check if port 22 is open
   sudo ufw status
   
   # If needed, allow SSH
   sudo ufw allow ssh
   ```

2. Try connecting with verbose output to see detailed error messages:
   ```bash
   ssh -v -i ~/.ssh/id_ed25519 your-ssh-user@your-vps-hostname
   ```

3. Verify that the SSH host key hasn't changed (which would cause known_hosts verification failures)

## Additional Resources

- [GitHub Actions Documentation for SSH](https://docs.github.com/en/actions/deployment/deploying-to-your-cloud-provider/deploying-to-amazon-elastic-container-service)
- [SSH Key Generation Guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
- [OpenSSH Documentation](https://www.openssh.com/manual.html)
