FROM mcr.microsoft.com/devcontainers/base:bullseye

RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

RUN wget -O- https://apt.releases.hashicorp.com/gpg | \
    gpg --dearmor | \
    tee /usr/share/keyrings/hashicorp-archive-keyring.gpg > /dev/null

RUN echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
    https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
    tee /etc/apt/sources.list.d/hashicorp.list

RUN curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh && \
    bash nodesource_setup.sh && \
    rm nodesource_setup.sh

ARG AWSCLI_VERSION=2.28.19
ARG SAM_CLI_VERSION=1.143.0
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    python3-pip \
    python3-venv \
    apt-transport-https \
    ca-certificates \
    gnupg \
    curl \
    unzip \
    google-cloud-cli \
    software-properties-common \
    terraform \
    nodejs

RUN pip install cfn-lint

## Install AWS CLI v2
RUN curl -fsSLO "https://awscli.amazonaws.com/awscli-exe-linux-x86_64-${AWSCLI_VERSION}.zip" && \
    unzip awscli-exe-linux-x86_64-${AWSCLI_VERSION}.zip && \
    ./aws/install && \
    rm -rf awscli-exe-linux-x86_64-${AWSCLI_VERSION}.zip aws

## Install AWS SAM CLI
RUN curl -fsSLO "https://github.com/aws/aws-sam-cli/releases/download/v${SAM_CLI_VERSION}/aws-sam-cli-linux-x86_64.zip" && \
    unzip aws-sam-cli-linux-x86_64.zip -d sam-installation && \
    ./sam-installation/install && \
    rm aws-sam-cli-linux-x86_64.zip && \
    rm -rf sam-installation