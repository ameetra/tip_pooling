# PowerShell script to install Terraform on Windows
# Run as Administrator

$terraformVersion = "1.7.0"
$downloadUrl = "https://releases.hashicorp.com/terraform/${terraformVersion}/terraform_${terraformVersion}_windows_amd64.zip"
$installPath = "C:\Program Files\Terraform"
$zipPath = "$env:TEMP\terraform.zip"

Write-Host "=========================================="
Write-Host "Terraform Installation Script"
Write-Host "=========================================="
Write-Host "Version: $terraformVersion"
Write-Host "Install Path: $installPath"
Write-Host ""

# Check if already installed
if (Get-Command terraform -ErrorAction SilentlyContinue) {
    $currentVersion = terraform --version
    Write-Host "Terraform is already installed:"
    Write-Host $currentVersion
    Write-Host ""
    $response = Read-Host "Do you want to reinstall? (y/n)"
    if ($response -ne "y") {
        Write-Host "Installation cancelled."
        exit
    }
}

# Create install directory
Write-Host "Creating installation directory..."
New-Item -ItemType Directory -Force -Path $installPath | Out-Null

# Download Terraform
Write-Host "Downloading Terraform $terraformVersion..."
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath
    Write-Host "Download complete!"
} catch {
    Write-Host "Error downloading Terraform: $_"
    exit 1
}

# Extract zip
Write-Host "Extracting Terraform..."
try {
    Expand-Archive -Path $zipPath -DestinationPath $installPath -Force
    Write-Host "Extraction complete!"
} catch {
    Write-Host "Error extracting Terraform: $_"
    exit 1
}

# Clean up zip file
Remove-Item $zipPath

# Add to PATH if not already there
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$installPath*") {
    Write-Host "Adding Terraform to system PATH..."
    [Environment]::SetEnvironmentVariable(
        "Path",
        "$currentPath;$installPath",
        "Machine"
    )
    Write-Host "PATH updated!"
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: You need to restart your terminal for PATH changes to take effect"
} else {
    Write-Host "Terraform is already in PATH"
}

Write-Host ""
Write-Host "=========================================="
Write-Host "✅ Terraform Installation Complete!"
Write-Host "=========================================="
Write-Host ""
Write-Host "Installation Path: $installPath"
Write-Host ""
Write-Host "Next Steps:"
Write-Host "1. Close and reopen your terminal/PowerShell"
Write-Host "2. Run: terraform --version"
Write-Host "3. Navigate to terraform directory: cd terraform"
Write-Host "4. Run: terraform init"
Write-Host ""
