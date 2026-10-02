provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = {
      Project     = "tip-pooling"
      Environment = var.environment
      ManagedBy   = "terraform"
      # Lowercase keys are the cost-allocation tags shared with other projects in this account.
      project = "tip-pooling"
      env     = "prod"
    }
  }
}
