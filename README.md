# TraderPlus Editor

A web-based editor for DayZ TraderPlus mod configuration.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Linting

Run `npm run lint` to execute the linting checks on the project.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## CI/CD Pipeline

This project includes a Continuous Integration and Continuous Deployment (CI/CD) pipeline using GitHub Actions. The pipeline:

1. Runs linting checks on the codebase
2. Builds the Angular application for production
3. Deploys the built application to a VPS via SSH (only on main/master branch)

### GitHub Secrets Setup for Deployment

To enable the automatic deployment to your VPS, you need to set up the following secrets in your GitHub repository:

1. `SSH_PRIVATE_KEY`: Your private SSH key for accessing the VPS
   - Generate a new key pair with: `ssh-keygen -t ed25519 -C "github-actions-deploy"`
   - Add the public key to your VPS's `~/.ssh/authorized_keys` file
   - Add the private key content as the secret value

2. `SSH_KNOWN_HOSTS`: The SSH known hosts entry for your VPS
   - Get this by running: `ssh-keyscan -H your-vps-hostname-or-ip`
   - Add the output as the secret value

3. `SSH_USER`: The username for SSH login to your VPS

4. `SSH_HOST`: The hostname or IP address of your VPS

5. `DEPLOY_PATH`: The path on your VPS where the application should be deployed
   - Example: `/var/www/traderpluseditor`
   - Ensure this directory exists and your SSH user has write permissions

To add these secrets:
1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret" and add each of the secrets above

For detailed instructions on setting up SSH keys for deployment, see the [SSH Setup Guide](./docs/ssh-setup-guide.md).

### Manual Deployment

You can manually deploy the application using the provided scripts:

- On Linux/macOS: `./deploy.sh <ssh_user> <ssh_host> <deploy_path>`
- On Windows: `deploy.bat <ssh_user> <ssh_host> <deploy_path>`

Example:
```bash
./deploy.sh user example.com /var/www/traderpluseditor
```

## Troubleshooting

### Package Version Issues

If you encounter npm package version issues during installation or CI/CD:

1. Make sure all Angular package versions are aligned (all should use the same major.minor version)
2. Create or update `.npmrc` file with:
   ```
   registry=https://registry.npmjs.org/
   legacy-peer-deps=true
   ```
3. Try clearing npm cache: `npm cache clean --force`
4. Delete `node_modules` and `package-lock.json`, then run `npm install`

### CI/CD Deployment Issues

If deployment fails:

1. Verify SSH keys are correctly set up in GitHub Secrets
2. Check that the target directory on the VPS exists and has correct permissions
3. Ensure the SSH user has write permissions to the deploy path
4. Test the rsync command locally to verify connectivity

You can also test your SSH connection before deploying:

```bash
./test-ssh-connection.sh <ssh_user> <ssh_host> <deploy_path> [ssh_key_path]
```

## Troubleshooting

### Package Version Issues

If you encounter npm package version issues during installation or CI/CD:

1. Make sure all Angular package versions are aligned (all should use the same major.minor version)
2. Create or update `.npmrc` file with:
   ```
   registry=https://registry.npmjs.org/
   legacy-peer-deps=true
   ```
3. Try clearing npm cache: `npm cache clean --force`
4. Delete `node_modules` and `package-lock.json`, then run `npm install`

### CI/CD Deployment Issues

If deployment fails:

1. Verify SSH keys are correctly set up in GitHub Secrets:
   - Make sure the private key is properly formatted (includes BEGIN and END lines)
   - Ensure the public key is added to the VPS's authorized_keys file
   - Check that the known_hosts entry matches your VPS

2. SSH Permission Issues:
   - Ensure the SSH user has write permissions to the deploy path
   - Check file ownership and permissions on the target directory
   - Verify that the SSH user can connect to the VPS manually

3. Testing SSH Connection:
   - Test SSH connection locally: `ssh <ssh_user>@<ssh_host>`
   - Test the rsync command locally to verify connectivity

4. Debug GitHub Actions:
   - Add debug steps to your workflow to print SSH configuration
   - Check the GitHub Actions logs for detailed error messages

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
