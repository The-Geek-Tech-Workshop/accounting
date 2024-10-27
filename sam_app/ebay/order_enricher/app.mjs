import ebayClientBuilder from "gtw-ebay-client";
import constants from "accounting_constants";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { sendMessages } from "event_bridge_wrapper";

const VAT_TAX_PERCENTAGE = 20;

const ebayClient = await ebayClientBuilder(
  `${import.meta.dirname}/ebay-auth.json`
);
const eventBridgeClient = new EventBridgeClient();

const idRegex = /^eBay O\*(?<id>.+)$/m;

export const lambdaHandler = async (event) => {
  const transaction = event.detail;
  const ebayOrderId = idRegex.exec(transaction.description).groups.id;

  const ebayOrderResponse = await ebayClient.trading.GetOrders({
    OrderIDArray: [{ OrderID: ebayOrderId }],
  });

  const order = ebayOrderResponse.OrderArray.Order[0];
  const item = order.TransactionArray.Transaction[0];
  const who = `${constants.ACCOUNTING.FROM.EBAY}: ${order.SellerUserID}`;

  const costsIncludeVat = !!(item.Taxes.TotalTaxAmount.value === 0);

  const getCost = (amount) => (costsIncludeVat ? amount : addVAT(amount));

  const additionalMessages =
    order.ShippingServiceSelected.ShippingServiceCost.value > 0
      ? [
          {
            Detail: JSON.stringify({
              ...transaction,
              isEnriched: true,
              sourceTransactionId: `${transaction.sourceTransactionId}-shipping`,
              debitedAccount: constants.ACCOUNT.INWARD_SHIPPING,
              amount: getCost(
                order.ShippingServiceSelected.ShippingServiceCost.value
              ),
              description: order.ShippingServiceSelected.ShippingService,
              who: who,
            }),
            DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
            Source: constants.MESSAGE.SOURCE.GTW_ACCOUNTING,
          },
        ]
      : [];
  const messages = [
    {
      Detail: JSON.stringify({
        ...transaction,
        isEnriched: true,
        amount: getCost(item.TransactionPrice.value),
        description: item.Item.Title,
        who: who,
      }),
      DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
      Source: constants.MESSAGE.SOURCE.GTW_ACCOUNTING,
    },
    ...additionalMessages,
  ];

  await sendMessages(eventBridgeClient, messages);
};

const addVAT = (costWithoutVAT) =>
  roundCurrencyAmountDown(
    costWithoutVAT + costWithoutVAT * (VAT_TAX_PERCENTAGE / 100)
  );

const roundCurrencyAmountDown = (amount) => Math.floor(amount * 100) / 100;
