# TraderPlus Editor

![Version](https://img.shields.io/badge/version-1.0.0--beta-blue)
![License](https://img.shields.io/badge/license-CC%20BY--NC--ND%204.0-green)
![Built with Angular](https://img.shields.io/badge/built%20with-Angular%2018-red)

<p align="center">
  <img src="https://github.com/TheDmitri/traderpluseditor/raw/main/src/assets/logo.png" alt="TraderPlus Editor Logo" width="200">
</p>

> A powerful web-based editor for DayZ TraderPlus mod configuration files - simplify your trader setup and management!

## 🎮 What is TraderPlus Editor?

TraderPlus Editor is a specialized web application designed for DayZ server administrators and mod enthusiasts who use the popular [TraderPlus mod](https://steamcommunity.com/sharedfiles/filedetails/?id=2458896948). This tool makes it easy to create, edit, and manage your trader configurations without the hassle of manual JSON editing.

### 🌟 Key Features

- **User-friendly Interface**: Intuitive design that makes trader configuration accessible to everyone
- **Visual Category Management**: Easily organize and structure your trader categories
- **Item Database Integration**: Quick search and add items from the DayZ item database
- **Price Management**: Set and adjust prices for individual items or in bulk
- **Import/Export**: Seamlessly import existing TraderPlus configurations and export your changes
- **Error Validation**: Automatic checking for common configuration errors
- **Backup System**: Create backups of your configurations before making changes

## 📋 Requirements

- Modern web browser (Chrome, Firefox, Edge, etc.)
- Internet connection for accessing the online version
- Basic understanding of DayZ server administration and the TraderPlus mod

## 🚀 Getting Started

### Online Version

The easiest way to use TraderPlus Editor is through our hosted online version:

1. Visit [traderpluseditor.com](https://traderpluseditor.com) (or your actual hosted URL)
2. Upload your existing TraderPlus configuration files or start from scratch
3. Make your changes and download the updated configuration

### Self-Hosting

If you prefer to run the editor locally or on your own server:

1. Clone this repository: `git clone https://github.com/TheDmitri/traderpluseditor.git`
2. Install dependencies: `npm install`
3. Start the development server: `npm start`
4. Access the editor at `http://localhost:4200`

For production deployment, see the [Deployment Guide](#deployment) below.

## 📖 How to Use

### Basic Workflow

1. **Import Configuration**: Upload your existing TraderPlus JSON files
2. **Edit Categories**: Organize your trader categories and subcategories
3. **Manage Items**: Add, remove, or modify items in each category
4. **Set Prices**: Adjust buy/sell prices for all items
5. **Export Configuration**: Download your updated configuration files
6. **Apply to Server**: Replace your server's TraderPlus configuration files

### Video Tutorials

- To be added

## 🔧 For Developers

### Development Environment

This project is built with Angular 18 and uses Angular Material for UI components.

```bash
# Start development server
ng serve

# Build for production
ng build

# Run linting checks
npm run lint

# Run unit tests
ng test
```

<details>
<summary><b>Technical Details</b> (click to expand)</summary>

### Project Structure

The application follows standard Angular architecture with these key components:

- **Core Services**: Configuration parsing, validation, and file handling
- **UI Components**: Modular interface elements for different editor functions
- **State Management**: Reactive state handling for configuration data

### Technologies Used

- Angular 18
- Angular Material
- RxJS
- JSZip (for handling configuration archives)

</details>

<a name="deployment"></a>
## 📦 Deployment

### Docker Deployment

The easiest way to deploy TraderPlus Editor is using Docker:

```bash
# Clone the repository
git clone https://github.com/TheDmitri/traderpluseditor.git
cd traderpluseditor

# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment

For manual deployment to a web server:

1. Build the application: `ng build --configuration=production`
2. Copy the contents of the `dist/traderpluseditor/browser` directory to your web server
3. Configure your web server to serve the application (sample configurations for Nginx/Apache available in the `docs` folder)

## 🤝 Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or code contributions, please feel free to help make this tool better for the DayZ community.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the [Creative Commons Attribution-NonCommercial-NoDerivs 4.0 International License](https://creativecommons.org/licenses/by-nc-nd/4.0/) (CC BY-NC-ND 4.0 DEED).

This means:
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made.
- **NonCommercial** — You may not use the material for commercial purposes.
- **NoDerivatives** — If you remix, transform, or build upon the material, you may not distribute the modified material.

See the [LICENSE](LICENSE) file for full details.

## 🙏 Acknowledgements

- [xscr33m](https://github.com/xscr33m) - Developer of the editor
- [TheDmitri](https://github.com/TheDmitri) - Lead Developer of the TraderPlus Editor & Creator of the TraderPlus mod
- The DayZ modding community for their continued support and feedback
- All contributors who have helped improve this tool

---

<p align="center">
  <b>Made with ❤️ for the DayZ community</b><br>
  <a href="https://github.com/TheDmitri/traderpluseditor">GitHub</a> |
  <a href="https://discord.gg/t9YkApe7K9">Discord</a> |
  <a href="https://ko-fi.com/thedmitri">Support Dmitri</a>
  <a href="https://ko-fi.com/xscr33m">Support xscr33m</a>
</p>

## 👨‍💻 Developer Section

<details>
<summary>Click to expand developer documentation</summary>

### Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

### Linting

Run `npm run lint` to execute the linting checks on the project.

### Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

### CI/CD Pipeline

This project includes a Continuous Integration and Continuous Deployment (CI/CD) pipeline using GitHub Actions. The pipeline:

1. Runs linting checks on the codebase
2. Builds the Angular application for production
3. Deploys the built application to a VPS via SSH (only on main/master branch)

#### GitHub Secrets Setup for Deployment

To enable the automatic deployment to your VPS, you need to set up the following secrets in your GitHub repository:

1. `SSH_PRIVATE_KEY`: Your private SSH key for accessing the VPS
2. `SSH_KNOWN_HOSTS`: The SSH known hosts entry for your VPS
3. `SSH_USER`: The username for SSH login to your VPS
4. `SSH_HOST`: The hostname or IP address of your VPS
5. `DEPLOY_PATH`: The path on your VPS where the application should be deployed

For detailed instructions on setting up SSH keys for deployment, see the [SSH Setup Guide](./docs/ssh-setup-guide.md).

### Troubleshooting

#### Package Version Issues

If you encounter npm package version issues during installation or CI/CD:

1. Make sure all Angular package versions are aligned (all should use the same major.minor version)
2. Create or update `.npmrc` file with:
   ```
   registry=https://registry.npmjs.org/
   legacy-peer-deps=true
   ```
3. Try clearing npm cache: `npm cache clean --force`
4. Delete `node_modules` and `package-lock.json`, then run `npm install`

#### CI/CD Deployment Issues

If deployment fails:

1. Verify SSH keys are correctly set up in GitHub Secrets
2. Check that the target directory on the VPS exists and has correct permissions
3. Ensure the SSH user has write permissions to the deploy path
4. Test the SSH connection locally: `ssh <ssh_user>@<ssh_host>`

</details>
