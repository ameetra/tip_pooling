@echo off
REM Terraform Backend Setup Script for Windows
REM Creates S3 bucket and DynamoDB table for Terraform state management

SET BUCKET_NAME=tip-pooling-terraform-state
SET DYNAMODB_TABLE=tip-pooling-terraform-locks
SET REGION=us-east-1
SET AWS_PROFILE=tip-pooling

echo ==========================================
echo Terraform Backend Setup
echo ==========================================
echo S3 Bucket: %BUCKET_NAME%
echo DynamoDB Table: %DYNAMODB_TABLE%
echo Region: %REGION%
echo AWS Profile: %AWS_PROFILE%
echo ==========================================
echo.

echo Getting AWS Account ID...
for /f %%i in ('aws sts get-caller-identity --profile %AWS_PROFILE% --query Account --output text') do set ACCOUNT_ID=%%i
echo Account ID: %ACCOUNT_ID%
echo.

echo Creating S3 bucket: %BUCKET_NAME%...
aws s3api create-bucket --bucket %BUCKET_NAME% --region %REGION% --profile %AWS_PROFILE% 2>nul
if errorlevel 1 echo Bucket already exists or creation failed
echo.

echo Enabling versioning on S3 bucket...
aws s3api put-bucket-versioning --bucket %BUCKET_NAME% --versioning-configuration Status=Enabled --profile %AWS_PROFILE%
echo.

echo Enabling encryption on S3 bucket...
aws s3api put-bucket-encryption --bucket %BUCKET_NAME% --server-side-encryption-configuration "{\"Rules\":[{\"ApplyServerSideEncryptionByDefault\":{\"SSEAlgorithm\":\"AES256\"}}]}" --profile %AWS_PROFILE%
echo.

echo Blocking public access on S3 bucket...
aws s3api put-public-access-block --bucket %BUCKET_NAME% --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" --profile %AWS_PROFILE%
echo.

echo Creating DynamoDB table: %DYNAMODB_TABLE%...
aws dynamodb create-table --table-name %DYNAMODB_TABLE% --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST --region %REGION% --profile %AWS_PROFILE% 2>nul
if errorlevel 1 echo Table already exists or creation failed
echo.

echo ==========================================
echo ✅ Terraform Backend Setup Complete!
echo ==========================================
echo.
echo S3 Bucket: %BUCKET_NAME%
echo   - Versioning: Enabled
echo   - Encryption: AES256
echo   - Public Access: Blocked
echo.
echo DynamoDB Table: %DYNAMODB_TABLE%
echo   - Billing Mode: Pay per request
echo   - Lock Management: Ready
echo.
echo Next Steps:
echo 1. Create Terraform backend configuration
echo 2. Initialize Terraform project
echo 3. Start deploying infrastructure
echo.
pause
