import AWS from "aws-sdk";
import ebayClientBuilder from "gtw-ebay-client";

const QUEUE_URL = process.env.QUEUE_URL;

const INWARD_SHIPPING_ACCOUNT_NAME = "Inward Shipping";

const VAT_TAX_PERCENTAGE = 20;

const ebayClient = await ebayClientBuilder(
  `${import.meta.dirname}/ebay-auth.json`
);
const sqs = new AWS.SQS();

export const lambdaHandler = async (event) => {
  for (const record of event.Records) {
    const transaction = JSON.parse(record.body);
    const ebayOrderId = record.messageAttributes.eBayOrderId.stringValue;

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
              Id: "shipping",
              MessageBody: JSON.stringify({
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
          ]
        : [];
    const messages = [
      {
        Id: "item",
        MessageBody: JSON.stringify({
          ...transaction,
          amount: getCost(item.TransactionPrice.value),
          description: item.Item.Title,
          who: who,
        }),
      },
      ...additionalMessages,
    ];

    await sqs
      .sendMessageBatch({
        Entries: messages,
        QueueUrl: QUEUE_URL,
      })
      .promise();
  }
};

const addVAT = (costWithoutVAT) =>
  roundCurrencyAmountDown(
    costWithoutVAT + costWithoutVAT * (VAT_TAX_PERCENTAGE / 100)
  );

const roundCurrencyAmountDown = (amount) => Math.floor(amount * 100) / 100;
