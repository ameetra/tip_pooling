variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "frontend_bucket_name" {
  type = string
}

variable "frontend_bucket_arn" {
  type = string
}

variable "api_gateway_url" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
