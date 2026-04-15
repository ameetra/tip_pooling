variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "api_lambda_invoke_arn" {
  type = string
}

variable "api_lambda_function_name" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
