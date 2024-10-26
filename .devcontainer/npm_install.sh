#!/bin/bash

for path in ebay/api_caller
do
    mkdir -p /workspaces/accounting/sam_app/$path/node_modules
    npm i --prefix /workspaces/accounting/sam_app/$path
done