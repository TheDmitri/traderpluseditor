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

For detailed setup instructions, see the [CI-CD-SETUP.md](./CI-CD-SETUP.md) file.

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

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
