import ebayClientBuilder from "gtw-ebay-client";

const INWARD_SHIPPING_ACCOUNT_NAME = "Inward Shipping";

const VAT_TAX_PERCENTAGE = 20;

const ebayClient = await ebayClientBuilder(
  `${import.meta.dirname}/ebay-auth.json`
);

export const lambdaHandler = async (event) => {
  const transaction = JSON.parse(event.detail.Message);
  const ebayOrderId = event.detail.MessageAttributes.eBayOrderId;

  const ebayOrderResponse = await ebayClient.trading.GetOrders({
    OrderIDArray: [{ OrderID: ebayOrderId }],
  });

  const order = ebayOrderResponse.OrderArray.Order[0];
  const item = order.TransactionArray.Transaction[0];
  const who = `eBay: ${order.SellerUserID}`;

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
                debitedAccount: INWARD_SHIPPING_ACCOUNT_NAME,
                amount: getCost(
                  order.ShippingServiceSelected.ShippingServiceCost.value
                ),
                description: order.ShippingServiceSelected.ShippingService,
                who: who,
              }),
            },
            DetailType: "transaction",
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
      },
      DetailType: "transaction",
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
