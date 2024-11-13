# gcloud iam service-accounts create terraform-provisioner \
#     --display-name="Terraform Provisioner"

for role in editor iam.workloadIdentityPoolAdmin iam.serviceAccountAdmin
do
    gcloud projects add-iam-policy-binding $GOOGLE_PROJECT_ID \
        --member="serviceAccount:terraform-provisioner@$GOOGLE_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/$role"
done

# gcloud storage buckets create "gs://terraform-state-bucket-${GOOGLE_PROJECT_ID}" \
#     --location=eu \
#     --uniform-bucket-level-access
# gcloud storage buckets add-iam-policy-binding "gs://terraform-state-bucket-${GOOGLE_PROJECT_ID}" \
#     --member="serviceAccount:terraform-provisioner@$GOOGLE_PROJECT_ID.iam.gserviceaccount.com" \
#     --role="roles/storage.admin"

