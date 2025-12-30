variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "lambda_functions" {
  type = map(string)
}

variable "tags" {
  type    = map(string)
  default = {}
}
