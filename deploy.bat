@echo off
REM TraderPlus Editor Deployment Script for Windows
REM Usage: deploy.bat <ssh_user> <ssh_host> <deploy_path>
REM Example: deploy.bat user example.com /var/www/traderpluseditor

REM Check if all arguments are provided
if "%~3"=="" (
    echo Usage: %0 ^<ssh_user^> ^<ssh_host^> ^<deploy_path^>
    exit /b 1
)

set SSH_USER=%~1
set SSH_HOST=%~2
set DEPLOY_PATH=%~3

echo Building application for production...
call npm run build -- --configuration=production

if %ERRORLEVEL% neq 0 (
    echo Build failed. Aborting deployment.
    exit /b 1
)

echo Deploying to %SSH_USER%@%SSH_HOST%:%DEPLOY_PATH%...
REM Requires rsync for Windows or WSL
where rsync >nul 2>nul
if %ERRORLEVEL% equ 0 (
    rsync -avz --delete dist/ %SSH_USER%@%SSH_HOST%:%DEPLOY_PATH%
) else (
    echo rsync not found. Trying with scp...
    scp -r dist/* %SSH_USER%@%SSH_HOST%:%DEPLOY_PATH%
)

if %ERRORLEVEL% neq 0 (
    echo Deployment failed.
    exit /b 1
)

echo Deployment completed successfully!
exit /b 0
