#!/bin/bash

echo $GOOGLE_SA_JSON > /workspaces/accounting/sam_app/sheets/writer/google_credentials.json
echo $GOOGLE_SA_JSON > /workspaces/accounting/sam_app/sheets/notification_writer/google_credentials.json
echo $PERSONAL_DATA > /workspaces/accounting/sam_app/starling/feed_item_to_transaction/personal.json

for dir in order_enricher api_caller payout_enricher token_gen transaction_checker transaction_to_gtw_transaction
do
    echo $EBAY_AUTH > /workspaces/accounting/sam_app/ebay/$dir/ebay-auth.json
done