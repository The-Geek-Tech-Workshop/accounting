import AWS from "aws-sdk";
import eBayApi from "ebay-api";

const QUEUE_URL = process.env.QUEUE_URL;
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_DEVELOPER_ID = process.env.EBAY_DEVELOPER_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const EBAY_RUNAME = process.env.EBAY_RUNAME;
const USE_EBAY_SANDBOX = process.env.USE_EBAY_SANDBOX;

const ebayClient = new eBayApi({
  appId: EBAY_CLIENT_ID,
  certId: EBAY_CLIENT_SECRET,
  sandbox: USE_EBAY_SANDBOX,
  devId: EBAY_DEVELOPER_ID,
  marketplaceId: eBayApi.MarketplaceId.EBAY_GB,
  ruName: EBAY_RUNAME,
});

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 */

export const lambdaHandler = async (event) => {
  const transaction = JSON.parse(event.Records[0].body).content;
  const ebayOrderId = event.Records[0].attributes.eBayOrderId;

  const ebayOrder = await ebayClient.trading.GetOrders({
    OrderIdArray: [{ OrderId: ebayOrderId }],
  });
  console.log(`ORDER: ${JSON.stringify(ebayOrder)}`);

  const sqs = new AWS.SQS();
  await sqs
    .sendMessage({
      MessageBody: JSON.stringify({ ...transaction,
        
       }),
      QueueUrl: QUEUE_URL,
    })
    .promise();
};
