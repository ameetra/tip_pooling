# Lambda Module - Serverless Functions

# --- Placeholder deployment package ---
data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder.zip"

  source {
    content  = "exports.handler = async (event) => ({ statusCode: 200, body: JSON.stringify({ message: 'Placeholder - deploy via CI/CD' }) });"
    filename = "index.js"
  }
}

# --- CloudWatch Log Group ---
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${var.name_prefix}-api"
  retention_in_days = 14
  tags              = var.tags
}

# --- Lambda Function ---
resource "aws_lambda_function" "api" {
  function_name = "${var.name_prefix}-api"
  role          = var.lambda_execution_role
  handler       = "index.handler"
  runtime       = var.runtime
  memory_size   = var.memory_size
  timeout       = var.timeout

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      NODE_ENV      = var.environment
      DB_SECRET_ARN = var.db_secret_arn
      DB_ENDPOINT   = var.db_endpoint
      DB_NAME       = var.db_name
    }
  }

  depends_on = [aws_cloudwatch_log_group.api]

  tags = var.tags
}

# --- Outputs ---
output "function_arns" {
  value = { api = aws_lambda_function.api.arn }
}

output "api_function_arn" {
  value = aws_lambda_function.api.arn
}

output "api_function_name" {
  value = aws_lambda_function.api.function_name
}

output "api_invoke_arn" {
  value = aws_lambda_function.api.invoke_arn
}
