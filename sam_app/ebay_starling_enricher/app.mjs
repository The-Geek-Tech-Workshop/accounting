import AWS from "aws-sdk";
import eBayApi from "ebay-api";
import { readFile } from "fs/promises";

const eBayAuth = JSON.parse(
  await readFile(new URL("./ebay-auth.json", import.meta.url))
);

const TOPIC_ARN = process.env.TOPIC_ARN;
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_DEVELOPER_ID = process.env.EBAY_DEVELOPER_ID;

const INWARD_SHIPPING_ACCOUNT_NAME = "Inward Shipping";

const ebayClient = new eBayApi({
  appId: EBAY_CLIENT_ID,
  certId: eBayAuth.certId,
  sandbox: false,
  devId: EBAY_DEVELOPER_ID,
  marketplaceId: eBayApi.MarketplaceId.EBAY_GB,
  authToken: eBayAuth.token,
});

const sns = new AWS.SNS();

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 */

export const lambdaHandler = async (event) => {
  for (const record of event.Records) {
    const transaction = JSON.parse(record.body);
    const ebayOrderId = record.attributes.eBayOrderId;

    const ebayOrderResponse = await ebayClient.trading.GetOrders({
      OrderIDArray: [{ OrderID: ebayOrderId }],
    });

    const order = ebayOrderResponse.OrderArray.Order[0];
    const item = order.TransactionArray.Transaction[0];

    await sns
      .publish({
        Message: JSON.stringify({
          ...transaction,
          amount: item.TransactionPrice.value,
          description: item.Item.Title,
          who: `eBay: ${order.SellerUserID}`,
        }),
        TopicArn: TOPIC_ARN,
      })
      .promise();

    if (order.ShippingServiceSelected.ShippingServiceCost.value > 0) {
      await sns
        .publish({
          Message: JSON.stringify({
            ...transaction,
            sourceTransactionId: `${transaction.sourceTransactionId}-shipping`,
            debitedAccount: INWARD_SHIPPING_ACCOUNT_NAME,
            amount: order.ShippingServiceSelected.ShippingServiceCost.value,
            description: order.ShippingServiceSelected.ShippingService,
            who: `eBay: ${order.SellerUserID}`,
          }),
          TopicArn: TOPIC_ARN,
        })
        .promise();
    }
  }
};
