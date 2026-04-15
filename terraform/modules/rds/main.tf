# RDS Module - PostgreSQL Database

# --- Secrets Manager for master password ---
resource "aws_secretsmanager_secret" "db_master" {
  name                    = "${var.name_prefix}/db-master-password"
  recovery_window_in_days = 0 # Allow immediate deletion in dev
  tags                    = var.tags
}

resource "random_password" "db_master" {
  length  = 32
  special = false # RDS master password doesn't allow all special chars
}

resource "aws_secretsmanager_secret_version" "db_master" {
  secret_id = aws_secretsmanager_secret.db_master.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.db_master.result
    dbname   = var.database_name
    engine   = "postgres"
    port     = 5432
  })
}

# --- DB Subnet Group ---
resource "aws_db_subnet_group" "main" {
  name       = "${var.name_prefix}-db-subnet-group"
  subnet_ids = var.private_subnet_ids
  tags       = merge(var.tags, { Name = "${var.name_prefix}-db-subnet-group" })
}

# --- RDS PostgreSQL Instance ---
resource "aws_db_instance" "main" {
  identifier     = "${var.name_prefix}-postgres"
  engine         = "postgres"
  engine_version = "15"

  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.database_name
  username = var.master_username
  password = random_password.db_master.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_security_group_id]
  publicly_accessible    = false
  multi_az               = var.multi_az

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  skip_final_snapshot       = var.environment == "dev"
  final_snapshot_identifier = var.environment != "dev" ? "${var.name_prefix}-final-snapshot" : null
  deletion_protection       = var.environment != "dev"

  tags = merge(var.tags, { Name = "${var.name_prefix}-postgres" })
}

# --- Outputs ---
output "db_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "db_name" {
  value = aws_db_instance.main.db_name
}

output "db_secret_arn" {
  value = aws_secretsmanager_secret.db_master.arn
}
