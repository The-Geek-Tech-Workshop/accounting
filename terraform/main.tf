# Create Workload Identity Pool
resource "google_iam_workload_identity_pool" "aws_pool" {
  workload_identity_pool_id = "aws-pool"
  display_name             = "AWS Workload Identity Pool"
  description             = "Identity pool for AWS Lambda functions"
}

# Create AWS Provider in the pool
resource "google_iam_workload_identity_pool_provider" "aws" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.aws_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "aws-provider"
  display_name                       = "AWS Provider"
  description                        = "AWS provider for Lambda functions"
  
  aws {
    account_id = var.aws_account_id
  }

  attribute_mapping = {
    "google.subject"        = "assertion.arn.extract('assumed-role/(.*?)/')"
    "attribute.aws_role"    = "assertion.arn.extract('assumed-role/({.*?})/')"
    "attribute.aws_account" = "assertion.account"
  }
}

# Create service account for Sheets access
resource "google_service_account" "sheets_writer" {
  account_id   = "sheets-writer"
  display_name = "Sheets Writer Service Account"
  description  = "Service account for AWS Lambda to access Google Sheets"
}

# # Grant Sheets access to service account
# resource "google_project_iam_member" "sheets_access" {
#   project = var.project_id
#   role    = "roles/sheets.editor"
#   member  = "serviceAccount:${google_service_account.sheets_writer.email}"
# }

data "google_project" "gcp_project" {}

# Allow AWS to impersonate the service account
resource "google_service_account_iam_binding" "workload_identity_user" {
  service_account_id = google_service_account.sheets_writer.name
  role               = "roles/iam.workloadIdentityUser"
  members = [
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.aws_pool.name}/subject/sheets-writer"
  ]
}