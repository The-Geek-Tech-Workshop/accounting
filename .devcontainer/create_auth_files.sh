#!/bin/bash

echo $GOOGLE_SA_JSON > /workspaces/accounting/sam_app/sheets_writer/google_credentials.json
echo $EBAY_AUTH > /workspaces/accounting/sam_app/ebay_order_enricher/ebay-auth.json
echo $EBAY_AUTH > /workspaces/accounting/sam_app/ebay_payout_enricher/ebay-auth.json