# Terraform Infrastructure for Tip Pooling System

This directory contains all Terraform configuration for deploying the tip pooling system infrastructure to AWS.

## Prerequisites

1. **Terraform installed** (>= 1.5.0)
   ```bash
   terraform --version
   ```

2. **AWS CLI configured** with `tip-pooling` profile
   ```bash
   aws sts get-caller-identity --profile tip-pooling
   ```

3. **Backend created** (S3 bucket + DynamoDB table)
   - Already done via `setup-terraform-backend.bat`

## Project Structure

```
terraform/
├── backend.tf              # Backend configuration (S3 + DynamoDB)
├── provider.tf             # AWS provider configuration
├── main.tf                 # Root module - orchestrates all modules
├── variables.tf            # Variable definitions
├── outputs.tf              # Output definitions
├── modules/                # Reusable modules
│   ├── iam/               # IAM roles and policies
│   ├── vpc/               # VPC and networking
│   ├── rds/               # PostgreSQL database
│   ├── lambda/            # Lambda functions
│   ├── api-gateway/       # API Gateway
│   ├── s3/                # S3 buckets
│   └── cloudfront/        # CloudFront CDN
└── environments/          # Environment-specific configs
    ├── dev/
    │   └── terraform.tfvars
    ├── staging/
    │   └── terraform.tfvars
    └── prod/
        └── terraform.tfvars
```

## Quick Start

### 1. Initialize Terraform

```bash
cd terraform
terraform init
```

This downloads providers and configures the S3 backend.

### 2. Deploy Development Environment

```bash
# Plan (dry run - see what will be created)
terraform plan -var-file="environments/dev/terraform.tfvars"

# Apply (actually create resources)
terraform apply -var-file="environments/dev/terraform.tfvars"
```

You'll be prompted to confirm. Type `yes` to proceed.

### 3. View Outputs

After deployment:

```bash
terraform output
```

Shows important values like:
- VPC ID
- RDS endpoint
- API Gateway URL
- CloudFront domain

## Environment-Specific Deployments

### Development
```bash
terraform workspace select dev || terraform workspace new dev
terraform plan -var-file="environments/dev/terraform.tfvars"
terraform apply -var-file="environments/dev/terraform.tfvars"
```

### Staging
```bash
terraform workspace select staging || terraform workspace new staging
terraform plan -var-file="environments/staging/terraform.tfvars"
terraform apply -var-file="environments/staging/terraform.tfvars"
```

### Production
```bash
terraform workspace select prod || terraform workspace new prod
terraform plan -var-file="environments/prod/terraform.tfvars"
terraform apply -var-file="environments/prod/terraform.tfvars"
```

## Common Commands

### View Current State
```bash
terraform show
```

### List Resources
```bash
terraform state list
```

### Destroy Infrastructure
```bash
terraform destroy -var-file="environments/dev/terraform.tfvars"
```
⚠️ **Warning:** This will delete ALL resources!

### Format Code
```bash
terraform fmt -recursive
```

### Validate Configuration
```bash
terraform validate
```

## Module Development Order

Build and test modules in this order:

1. ✅ **IAM** - Roles and policies (no dependencies)
2. ✅ **VPC** - Network infrastructure (no dependencies)
3. ✅ **RDS** - Database (depends on VPC)
4. ✅ **S3** - Storage buckets (no dependencies)
5. ⏳ **Lambda** - Functions (depends on VPC, RDS, IAM)
6. ⏳ **API Gateway** - REST API (depends on Lambda)
7. ⏳ **CloudFront** - CDN (depends on S3, API Gateway)

## Cost Optimization

### Development Environment (~$35-55/month)
- RDS: db.t3.micro, single AZ
- Lambda: Pay per use (free tier eligible)
- S3: Pay per storage + requests
- CloudFront: Free tier covers most dev traffic

### Production Environment (~$130-170/month for 10 tenants)
- RDS: db.t3.small, Multi-AZ
- Lambda: Provisioned concurrency for critical functions
- S3: Lifecycle policies for old data
- CloudFront: Optimized caching

## Security Notes

🔒 **Secrets Management**
- Database passwords stored in AWS Secrets Manager
- Never commit secrets to Git
- Use Terraform variables with `sensitive = true`

🔒 **Network Security**
- RDS in private subnets only
- Lambda in VPC with security groups
- API Gateway with rate limiting
- CloudFront with WAF (optional)

## Troubleshooting

### Backend Already Initialized Error
```bash
rm -rf .terraform
terraform init -reconfigure
```

### State Lock Error
If someone else is running Terraform or previous run failed:
```bash
terraform force-unlock <LOCK_ID>
```

### Resource Already Exists
```bash
# Import existing resource
terraform import module.vpc.aws_vpc.main vpc-xxxxx
```

## Next Steps

1. **Create IAM module** - Define Lambda execution role
2. **Create VPC module** - Define network infrastructure
3. **Create RDS module** - Define PostgreSQL database
4. **Test deployment** - Deploy to dev environment
5. **Iterate** - Add remaining modules

## References

- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Best Practices](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)
- Project TDD: `../tip-pooling-system-tdd.md`
- Implementation Plan: `../IMPLEMENTATION_PLAN.md`
