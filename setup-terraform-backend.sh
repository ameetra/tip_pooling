#!/bin/bash

# Terraform Backend Setup Script
# Creates S3 bucket and DynamoDB table for Terraform state management

set -e  # Exit on error

# Configuration
BUCKET_NAME="tip-pooling-terraform-state"
DYNAMODB_TABLE="tip-pooling-terraform-locks"
REGION="us-east-1"  # Change if needed
AWS_PROFILE="tip-pooling"

echo "=========================================="
echo "Terraform Backend Setup"
echo "=========================================="
echo "S3 Bucket: ${BUCKET_NAME}"
echo "DynamoDB Table: ${DYNAMODB_TABLE}"
echo "Region: ${REGION}"
echo "AWS Profile: ${AWS_PROFILE}"
echo "=========================================="
echo ""

# Get AWS Account ID
echo "Getting AWS Account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --profile ${AWS_PROFILE} --query Account --output text)
echo "Account ID: ${ACCOUNT_ID}"
echo ""

# Create S3 bucket for Terraform state
echo "Creating S3 bucket: ${BUCKET_NAME}..."
aws s3api create-bucket \
  --bucket ${BUCKET_NAME} \
  --region ${REGION} \
  --profile ${AWS_PROFILE} \
  2>/dev/null || echo "Bucket already exists or creation failed"

# Enable versioning (important for state recovery)
echo "Enabling versioning on S3 bucket..."
aws s3api put-bucket-versioning \
  --bucket ${BUCKET_NAME} \
  --versioning-configuration Status=Enabled \
  --profile ${AWS_PROFILE}

# Enable server-side encryption
echo "Enabling encryption on S3 bucket..."
aws s3api put-bucket-encryption \
  --bucket ${BUCKET_NAME} \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  --profile ${AWS_PROFILE}

# Block public access
echo "Blocking public access on S3 bucket..."
aws s3api put-public-access-block \
  --bucket ${BUCKET_NAME} \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --profile ${AWS_PROFILE}

# Create DynamoDB table for state locking
echo "Creating DynamoDB table: ${DYNAMODB_TABLE}..."
aws dynamodb create-table \
  --table-name ${DYNAMODB_TABLE} \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ${REGION} \
  --profile ${AWS_PROFILE} \
  2>/dev/null || echo "Table already exists or creation failed"

echo ""
echo "=========================================="
echo "✅ Terraform Backend Setup Complete!"
echo "=========================================="
echo ""
echo "S3 Bucket: ${BUCKET_NAME}"
echo "  - Versioning: Enabled"
echo "  - Encryption: AES256"
echo "  - Public Access: Blocked"
echo ""
echo "DynamoDB Table: ${DYNAMODB_TABLE}"
echo "  - Billing Mode: Pay per request"
echo "  - Lock Management: Ready"
echo ""
echo "Next Steps:"
echo "1. Create Terraform backend configuration"
echo "2. Initialize Terraform project"
echo "3. Start deploying infrastructure"
echo ""
