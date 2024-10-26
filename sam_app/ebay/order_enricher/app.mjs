import ebayClientBuilder from "gtw-ebay-client";
import constants from "accounting_constants";

const VAT_TAX_PERCENTAGE = 20;

const ebayClient = await ebayClientBuilder(
  `${import.meta.dirname}/ebay-auth.json`
);

export const lambdaHandler = async (event) => {
  const transaction = JSON.parse(event.detail.Message);
  const ebayOrderId = event.detail.MessageAttributes.ebayId;

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
            Detail: {
              Message: JSON.stringify({
                ...transaction,
                sourceTransactionId: `${transaction.sourceTransactionId}-shipping`,
                debitedAccount: constants.ACCOUNT.INWARD_SHIPPING,
                amount: getCost(
                  order.ShippingServiceSelected.ShippingServiceCost.value
                ),
                description: order.ShippingServiceSelected.ShippingService,
                who: who,
              }),
              MessageAttributes: {
                isEnriched: true,
              },
            },
            DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
          },
        ]
      : [];
  const messages = [
    {
      Detail: {
        Message: JSON.stringify({
          ...transaction,
          amount: getCost(item.TransactionPrice.value),
          description: item.Item.Title,
          who: who,
        }),
        MessageAttributes: {
          isEnriched: true,
        },
      },
      DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
    },
    ...additionalMessages,
  ];

  return { Messages: messages };
};

const addVAT = (costWithoutVAT) =>
  roundCurrencyAmountDown(
    costWithoutVAT + costWithoutVAT * (VAT_TAX_PERCENTAGE / 100)
  );

const roundCurrencyAmountDown = (amount) => Math.floor(amount * 100) / 100;
