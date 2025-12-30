# Main Terraform configuration for tip pooling system

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# IAM Module - Lambda execution role and policies
module "iam" {
  source = "./modules/iam"

  name_prefix = local.name_prefix
  environment = var.environment
  tags        = local.common_tags
}

# VPC Module - Network infrastructure
module "vpc" {
  source = "./modules/vpc"

  name_prefix        = local.name_prefix
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  environment        = var.environment
  tags               = local.common_tags
}

# RDS Module - PostgreSQL database
module "rds" {
  source = "./modules/rds"

  name_prefix         = local.name_prefix
  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  instance_class      = var.db_instance_class
  database_name       = var.db_name
  master_username     = var.db_username
  allocated_storage   = var.db_allocated_storage
  multi_az            = var.db_multi_az
  tags                = local.common_tags

  depends_on = [module.vpc]
}

# S3 Module - Storage buckets
module "s3" {
  source = "./modules/s3"

  name_prefix = local.name_prefix
  environment = var.environment
  tags        = local.common_tags
}

# Lambda Module - Serverless functions
module "lambda" {
  source = "./modules/lambda"

  name_prefix            = local.name_prefix
  environment            = var.environment
  runtime                = var.lambda_runtime
  memory_size            = var.lambda_memory_size
  timeout                = var.lambda_timeout
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  lambda_execution_role  = module.iam.lambda_execution_role_arn
  db_endpoint            = module.rds.db_endpoint
  db_name                = module.rds.db_name
  db_secret_arn          = module.rds.db_secret_arn
  tags                   = local.common_tags

  depends_on = [module.vpc, module.rds, module.iam]
}

# API Gateway Module - REST API
module "api_gateway" {
  source = "./modules/api-gateway"

  name_prefix      = local.name_prefix
  environment      = var.environment
  lambda_functions = module.lambda.function_arns
  tags             = local.common_tags

  depends_on = [module.lambda]
}

# CloudFront Module - CDN for frontend
module "cloudfront" {
  source = "./modules/cloudfront"

  name_prefix          = local.name_prefix
  environment          = var.environment
  frontend_bucket_name = module.s3.frontend_bucket_name
  frontend_bucket_arn  = module.s3.frontend_bucket_arn
  api_gateway_url      = module.api_gateway.api_url
  domain_name          = var.domain_name
  tags                 = local.common_tags

  depends_on = [module.s3, module.api_gateway]
}
