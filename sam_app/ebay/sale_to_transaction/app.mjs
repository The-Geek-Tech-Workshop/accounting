import ebayClientBuilder from "gtw-ebay-client";
import { DateTime } from "luxon";
import constants from "accounting_constants";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { sendMessages } from "event_bridge_wrapper";

const EBAY_FEE_DATA = {
  REGULATORY_OPERATING_FEE: {
    code: "regOpFee",
    description: "Regulatory operating fee",
  },
  FINAL_VALUE_FEE_FIXED_PER_ORDER: {
    code: "finalFixed",
    description: "Final value fee (fixed per order)",
  },
  FINAL_VALUE_FEE: {
    code: "finalVar",
    description: "Final value fee (variable per order)",
  },
};

const ebayClient = await ebayClientBuilder(
  `${import.meta.dirname}/ebay-auth.json`
);
const eventBridgeClient = new EventBridgeClient();

export const lambdaHandler = async (event) => {
  const saleTransaction = event.detail;

  const ebayOrderResponse = await ebayClient.trading.GetOrders({
    OrderIDArray: [{ OrderID: saleTransaction.orderId }],
  });
  const order = ebayOrderResponse.OrderArray.Order[0];
  const item = order.TransactionArray.Transaction[0];

  await sendMessages(
    eventBridgeClient,
    saleTransaction.orderLineItems.reduce((messages, lineItem) => {
      const baseSourceTransactionId = `${ebayTransaction.transactionId}-${lineItem.lineItemId}`;
      const transactionDate = DateTime.fromISO(
        saleTransaction.transactionDate
      ).toISODate();
      return [
        ...messages,
        {
          Detail: JSON.stringify({
            source: constants.ACCOUNTING.SOURCE.EBAY,
            sourceTransactionId: `${baseSourceTransactionId}-sale`,
            transactionDate: transactionDate,
            creditedAccount: constants.ACCOUNT.SALES,
            debitedAccount: constants.ACCOUNT.EBAY,
            skuOrPurchaseId: item.SKU,
            amount: lineItem.feeBasisAmount.value,
            description: item.Title,
            who: `${paymentsEntity}: ${saleTransaction.buyer.username}`,
          }),
          DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
          Source: constants.MESSAGE.SOURCE.GTW_ACCOUNTING,
        },
        ...lineItem.marketplaceFees.map((fee) => {
          const feeData = EBAY_FEE_DATA[fee.feeType];
          return {
            Detail: JSON.stringify({
              source: ACCOUNTING_SOURCE__EBAY,
              sourceTransactionId: `${baseSourceTransactionId}-${feeData.code}`,
              transactionDate: transactionDate,
              creditedAccount: constants.ACCOUNT.EBAY,
              debitedAccount: constants.ACCOUNT.TRANSACTION_FEES,
              skuOrPurchaseId: item.SKU,
              amount: fee.amount.value,
              description: feeData.description,
              who: saleTransaction.paymentsEntity,
            }),
            DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
            Source: constants.MESSAGE.SOURCE.GTW_ACCOUNTING,
          };
        }),
      ];
    })
  );
};
