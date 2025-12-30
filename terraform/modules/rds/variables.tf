variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "instance_class" {
  type = string
}

variable "database_name" {
  type = string
}

variable "master_username" {
  type = string
}

variable "allocated_storage" {
  type = number
}

variable "multi_az" {
  type = bool
}

variable "tags" {
  type    = map(string)
  default = {}
}
