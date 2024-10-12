import ebayClientBuilder from "gtw-ebay-client";
import { DateTime } from "luxon";
import constants from "accounting_constants";

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
export const lambdaHandler = async (event) => {
  const saleTransaction = event.detail;

  const ebayOrderResponse = await ebayClient.trading.GetOrders({
    OrderIDArray: [{ OrderID: saleTransaction.orderId }],
  });
  const item = orderTransaction.Item;

  return {
    Messages: saleTransaction.orderLineItems.reduce((messages, lineItem) => {
      const baseSourceTransactionId = `${ebayTransaction.transactionId}-${lineItem.lineItemId}`;
      const transactionDate = DateTime.fromISO(
        saleTransaction.transactionDate
      ).toISODate();
      return [
        ...messages,
        {
          Detail: {
            Message: JSON.stringify({
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
            MessageAttributes: {
              isEnriched: true,
            },
          },
          DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
        },
        ...lineItem.marketplaceFees.map((fee) => {
          const feeData = EBAY_FEE_DATA[fee.feeType];
          return {
            Detail: {
              Message: {
                source: ACCOUNTING_SOURCE__EBAY,
                sourceTransactionId: `${baseSourceTransactionId}-${feeData.code}`,
                transactionDate: transactionDate,
                creditedAccount: constants.ACCOUNT.EBAY,
                debitedAccount: constants.ACCOUNT.TRANSACTION_FEES,
                skuOrPurchaseId: item.SKU,
                amount: fee.amount.value,
                description: feeData.description,
                who: saleTransaction.paymentsEntity,
              },
              MessageAttributes: {
                isEnriched: true,
              },
            },
            DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
          };
        }),
      ];
    }),
  };
};
