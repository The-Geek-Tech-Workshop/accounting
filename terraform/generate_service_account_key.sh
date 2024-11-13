#!/bin/bash
gcloud iam service-accounts keys create terraform-key.json --iam-account=terraform-provisioner@$GOOGLE_PROJECT_ID.iam.gserviceaccount.com