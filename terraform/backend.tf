terraform {
  backend "s3" {
    bucket         = "tip-pooling-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tip-pooling-terraform-locks"
    encrypt        = true
    profile        = "tip-pooling"
  }

  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
