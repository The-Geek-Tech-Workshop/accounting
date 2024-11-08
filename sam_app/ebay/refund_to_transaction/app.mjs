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
  const returnTransaction = event.detail;

  const ebayOrderResponse = await ebayClient.trading.GetOrders({
    OrderIDArray: [{ OrderID: returnTransaction.orderId }],
  });

  const order = ebayOrderResponse.OrderArray.Order[0];
  const item = order.TransactionArray.Transaction[0].Item;

  await sendMessages(eventBridgeClient, [
    {
      Detail: JSON.stringify({
        source: constants.ACCOUNTING.SOURCE.EBAY,
        sourceTransactionId: returnTransaction.transactionId,
        transactionDate: DateTime.fromISO(
          returnTransaction.transactionDate
        ).toISODate(),
        creditedAccount: constants.ACCOUNT.EBAY,
        debitedAccount: constants.ACCOUNT.SALE_RETURNS,
        skuOrPurchaseId: item.SKU,
        amount: returnTransaction.amount.value,
        description: "",
        who: `${returnTransaction.paymentsEntity}: ${order.BuyerUserID}`,
      }),
      DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
      Source: constants.MESSAGE.SOURCE.GTW_ACCOUNTING,
    },
  ]);
};
