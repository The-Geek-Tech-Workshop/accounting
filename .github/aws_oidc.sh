#!/bin/bash
aws cloudformation $1-stack \
  --stack-name github-oidc \
  --template-body file://github-oidc.yaml \
  --parameters \
    ParameterKey=GitHubOrg,ParameterValue=$2 \
    ParameterKey=GitHubRepo,ParameterValue=$3 \
  --capabilities CAPABILITY_NAMED_IAM

aws cloudformation describe-stacks \
  --stack-name github-oidc \
  --query 'Stacks[0].Outputs[?OutputKey==`RoleArn`].OutputValue' \
  --output text