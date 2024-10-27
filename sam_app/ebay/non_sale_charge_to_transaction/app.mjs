import ebayClientBuilder from "gtw-ebay-client";
import { DateTime } from "luxon";
import constants from "accounting_constants";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { sendMessages } from "event_bridge_wrapper";

const ebayClient = await ebayClientBuilder(
  `${import.meta.dirname}/ebay-auth.json`
);

const eventBridgeClient = new EventBridgeClient();

export const lambdaHandler = async (event) => {
  const nonSaleChargeTransaction = event.detail;

  const messages =
    nonSaleChargeTransaction.feeType === constants.EBAY.FEE_TYPE.INSERTION_FEE
      ? await processInsertionFeeTransaction(nonSaleChargeTransaction)
      : [];

  await sendMessages(eventBridgeClient, messages);
};

const processInsertionFeeTransaction = async (insertionFeeTransaction) => {
  const ebayItemResponse = await ebayClient.trading.GetItem({
    ItemID: insertionFeeTransaction.references[0].referenceId,
  });
  const item = ebayItemResponse.Item;
  return [
    {
      Detail: JSON.stringify({
        source: constants.ACCOUNTING.SOURCE.EBAY,
        sourceTransactionId: insertionFeeTransaction.transactionId,
        transactionDate: DateTime.fromISO(
          insertionFeeTransaction.transactionDate
        ).toISODate(),
        creditedAccount: constants.ACCOUNT.EBAY,
        debitedAccount: constants.ACCOUNT.LISTING_FEES,
        skuOrPurchaseId: item.SKU,
        amount: insertionFeeTransaction.amount.value,
        description: "Listing fee",
        who: constants.ACCOUNTING.FROM.EBAY,
      }),
      DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
      Source: constants.MESSAGE.SOURCE.GTW_ACCOUNTING,
    },
  ];
};
