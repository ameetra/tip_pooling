# S3 Module - Storage Buckets

# --- Frontend Bucket (served via CloudFront OAC) ---
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.name_prefix}-frontend"
  tags   = merge(var.tags, { Name = "${var.name_prefix}-frontend" })
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration { status = "Enabled" }
}

# --- Exports Bucket (CSV exports, 7-day lifecycle) ---
resource "aws_s3_bucket" "exports" {
  bucket = "${var.name_prefix}-exports"
  tags   = merge(var.tags, { Name = "${var.name_prefix}-exports" })
}

resource "aws_s3_bucket_public_access_block" "exports" {
  bucket                  = aws_s3_bucket.exports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "exports" {
  bucket = aws_s3_bucket.exports.id

  rule {
    id     = "expire-exports"
    status = "Enabled"
    filter {} # Apply to all objects
    expiration { days = 7 }
  }
}

# --- Outputs ---
output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.id
}

output "frontend_bucket_arn" {
  value = aws_s3_bucket.frontend.arn
}

output "frontend_bucket_regional_domain_name" {
  value = aws_s3_bucket.frontend.bucket_regional_domain_name
}

output "exports_bucket_name" {
  value = aws_s3_bucket.exports.id
}
