#!/bin/bash

echo $PERSONAL_DATA > /workspaces/accounting/sam_app/starling/feed_item_to_transaction/personal.json

for dir in order_enricher token_gen transaction_fetcher non_sale_charge_to_transaction shipping_label_to_transaction sale_to_transaction sale_to_transaction refund_to_transaction
do
    echo $EBAY_AUTH > /workspaces/accounting/sam_app/ebay/$dir/ebay-auth.json
done