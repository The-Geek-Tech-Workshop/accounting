import AWS from "aws-sdk";
import eBayApi from "ebay-api";
import { readFile } from "fs/promises";

const eBayAuth = JSON.parse(
  await readFile(new URL("./ebay-auth.json", import.meta.url))
);

const QUEUE_URL = process.env.QUEUE_URL;

const INWARD_SHIPPING_ACCOUNT_NAME = "Inward Shipping";

const ebayClient = new eBayApi({
  appId: eBayAuth.clientId,
  certId: eBayAuth.certId,
  sandbox: false,
  devId: eBayAuth.developerId,
  marketplaceId: eBayApi.MarketplaceId.EBAY_GB,
  signature: {
    jwe: eBayAuth.digitalSignature.jwe,
    privateKey: eBayAuth.digitalSignature.privateKey,
  },
  ruName: eBayAuth.oAuth2.ruName,
});
ebayClient.OAuth2.setCredentials(eBayAuth.oAuth2.credentials);

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

    const additionalMessages =
      order.ShippingServiceSelected.ShippingServiceCost.value > 0
        ? [
            {
              Id: "shipping",
              MessageBody: JSON.stringify({
                ...transaction,
                sourceTransactionId: `${transaction.sourceTransactionId}-shipping`,
                debitedAccount: INWARD_SHIPPING_ACCOUNT_NAME,
                amount: order.ShippingServiceSelected.ShippingServiceCost.value,
                description: order.ShippingServiceSelected.ShippingService,
                who: who,
              }),
            },
          ]
        : [];
    await sqs
      .sendMessageBatch({
        Entries: [
          {
            Id: "item",
            MessageBody: JSON.stringify({
              ...transaction,
              amount: item.TransactionPrice.value,
              description: item.Item.Title,
              who: who,
            }),
          },
          ...additionalMessages,
        ],
        QueueUrl: QUEUE_URL,
      })
      .promise();
  }
};