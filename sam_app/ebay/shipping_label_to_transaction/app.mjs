import ebayClientBuilder from "gtw-ebay-client";
import { DateTime } from "luxon";
import constants from "accounting_constants";

const ebayClient = await ebayClientBuilder(
  `${import.meta.dirname}/ebay-auth.json`
);
export const lambdaHandler = async (event) => {
  const shippingLabelTransaction = event.detail;

  const ebayOrderResponse = await ebayClient.trading.GetOrders({
    OrderIDArray: [{ OrderID: shippingLabelTransaction.orderId }],
  });
  const order = ebayOrderResponse.OrderArray.Order[0];
  const orderTransaction = order.TransactionArray.Transaction[0];
  const item = orderTransaction.Item;

  return {
    Messages: [
      {
        Detail: {
          Message: JSON.stringify({
            source: constants.ACCOUNTING.SOURCE.EBAY,
            sourceTransactionId: shippingLabelTransaction.transactionId,
            transactionDate: DateTime.fromISO(
              shippingLabelTransaction.transactionDate
            ).toISODate(),
            creditedAccount: constants.ACCOUNT.EBAY,
            debitedAccount: constants.ACCOUNT.OUTWARD_SHIPPING,
            skuOrPurchaseId: item.SKU,
            amount: shippingLabelTransaction.amount.value,
            description:
              orderTransaction.ShippingDetails.ShipmentTrackingDetails
                .ShippingCarrierUsed,
            who: shippingLabelTransaction.paymentsEntity,
          }),
          MessageAttributes: {
            isEnriched: true,
          },
        },
        DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
      },
    ],
  };
};
