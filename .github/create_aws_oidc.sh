#!/bin/bash
aws cloudformation create-stack \
  --stack-name github-oidc \
  --template-body file://github-oidc.yaml \
  --parameters \
    ParameterKey=GitHubOrg,ParameterValue=$1 \
    ParameterKey=GitHubRepo,ParameterValue=$2 \
  --capabilities CAPABILITY_NAMED_IAM

aws cloudformation describe-stacks \
  --stack-name github-oidc \
  --query 'Stacks[0].Outputs[?OutputKey==`RoleArn`].OutputValue' \
  --output text