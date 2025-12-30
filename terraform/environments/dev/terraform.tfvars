# Development Environment Configuration

environment = "dev"
aws_region  = "us-east-1"
aws_profile = "tip-pooling"

# VPC Configuration
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# RDS Configuration - Small instance for dev
db_instance_class     = "db.t3.micro"
db_name               = "tippooling_dev"
db_username           = "tippooling_admin"
db_allocated_storage  = 20
db_multi_az           = false  # Single AZ for cost savings

# Lambda Configuration
lambda_runtime     = "nodejs20.x"
lambda_memory_size = 512
lambda_timeout     = 30

# Domain Configuration (optional)
domain_name          = ""
create_route53_zone  = false
