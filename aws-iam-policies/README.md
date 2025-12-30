# AWS IAM Policies for Tip Pooling System

This directory contains 6 separate IAM policies that should all be attached to the `tip-pooling-admin` role. They are split because AWS has a 6144 character limit per policy.

## Policies

1. **1-core-infrastructure.json** - Lambda, RDS, VPC, networking
2. **2-storage-cdn.json** - S3, DynamoDB, CloudFront, Terraform state
3. **3-app-services.json** - Secrets Manager, SES, Cognito, API Gateway
4. **4-monitoring-ops.json** - CloudWatch, SNS, X-Ray
5. **5-iam-management.json** - IAM roles and policies (for Lambda service roles)
6. **6-dns-certificates.json** - Route53, ACM (optional if using custom domain)

## How to Apply (AWS Console)

For each policy file:

1. Open the JSON file and copy contents
2. Go to **IAM Console** → **Policies** → **Create policy**
3. Click **JSON** tab and paste
4. Click **Next: Tags** → **Next: Review**
5. Name it using the pattern: `TipPooling-{PolicyName}`
   - `TipPooling-CoreInfrastructure`
   - `TipPooling-StorageCDN`
   - `TipPooling-AppServices`
   - `TipPooling-MonitoringOps`
   - `TipPooling-IAMManagement`
   - `TipPooling-DNSCertificates`
6. Click **Create policy**
7. Repeat for all 6 policies

Then attach all 6 to your user:

8. Go to **Users** → `tip-pool-admin`
9. Click **Permissions** tab → **Add permissions** → **Attach policies directly**
10. Search for `TipPooling-` and select all 6 policies
11. Click **Add permissions**

## How to Apply (AWS CLI)

```bash
# Set your account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Navigate to the policies directory
cd aws-iam-policies

# Create all policies
aws iam create-policy --policy-name TipPooling-CoreInfrastructure --policy-document file://1-core-infrastructure.json
aws iam create-policy --policy-name TipPooling-StorageCDN --policy-document file://2-storage-cdn.json
aws iam create-policy --policy-name TipPooling-AppServices --policy-document file://3-app-services.json
aws iam create-policy --policy-name TipPooling-MonitoringOps --policy-document file://4-monitoring-ops.json
aws iam create-policy --policy-name TipPooling-IAMManagement --policy-document file://5-iam-management.json
aws iam create-policy --policy-name TipPooling-DNSCertificates --policy-document file://6-dns-certificates.json

# Attach all policies to your user
aws iam attach-user-policy --user-name tip-pool-admin --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/TipPooling-CoreInfrastructure
aws iam attach-user-policy --user-name tip-pool-admin --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/TipPooling-StorageCDN
aws iam attach-user-policy --user-name tip-pool-admin --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/TipPooling-AppServices
aws iam attach-user-policy --user-name tip-pool-admin --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/TipPooling-MonitoringOps
aws iam attach-user-policy --user-name tip-pool-admin --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/TipPooling-IAMManagement
aws iam attach-user-policy --user-name tip-pool-admin --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/TipPooling-DNSCertificates
```

## What Each Policy Grants

### 1. Core Infrastructure
- Create/manage Lambda functions (`tip-pooling-*`)
- Create/manage RDS PostgreSQL instances
- Create VPC, subnets, NAT gateway, security groups

### 2. Storage & CDN
- Create/manage S3 buckets (`tip-pooling-*`)
- Terraform state management (S3 + DynamoDB)
- Create/manage CloudFront distributions

### 3. Application Services
- Store/retrieve secrets (database credentials)
- Send emails via SES (magic links)
- Manage Cognito user pools (authentication)
- Create/manage API Gateway REST APIs

### 4. Monitoring & Operations
- Create CloudWatch log groups and alarms
- Create SNS topics for notifications
- X-Ray tracing

### 5. IAM Management
- Create service roles for Lambda functions
- Create policies for Lambda execution
- PassRole permission (needed to assign roles to Lambda)

### 6. DNS & Certificates (Optional)
- Manage Route53 hosted zones
- Request/manage ACM SSL certificates
- Only needed if using custom domain

## Security Notes

✅ **Least Privilege** - Only grants necessary permissions
✅ **Resource Scoped** - Most permissions limited to `tip-pooling-*` resources
✅ **No Wildcard Admin** - No unrestricted `*:*` permissions
✅ **No User Management** - Cannot create/delete IAM users

## Verification

After attaching all policies, verify:

```bash
aws iam list-attached-user-policies --user-name tip-pool-admin
```

You should see all 6 policies listed.
