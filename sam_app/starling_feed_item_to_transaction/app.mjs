import dateFormat from "dateformat";
import AWS from "aws-sdk";

const ISO_DATE_MASK = "isoDate";
const STARLING_BANK_ACCOUNT_NAME = "GTW";
const STARLING_SOURCE = "STARLING";
const TOPIC_ARN = process.env.TOPIC_ARN;
const EBAY_STARLING_UID = "ae3f1752-1bf2-4bf5-8a03-2fad3dc3d468";

const ebayOrderIdRegex = /^eBay .\*(?<orderId>.+)$/gm;
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
    const feedItem = JSON.parse(record.body).content;

    const transactionId = `${STARLING_SOURCE}-${feedItem.feedItemUid}`;
    const transactionWasOutgoing = feedItem.direction === "OUT";
    const creditedAccount = transactionWasOutgoing
      ? STARLING_BANK_ACCOUNT_NAME
      : "";
    const debitedAccount = transactionWasOutgoing
      ? ""
      : STARLING_BANK_ACCOUNT_NAME;

    const additionalMessageAttributes =
      transactionWasOutgoing && feedItem.counterPartyUid === EBAY_STARLING_UID
        ? {
            ebayOrderId: {
              DataType: "String",
              StringValue: ebayOrderIdRegex.match(feedItem.reference).orderId,
            },
          }
        : {};

    await sns
      .publish({
        Message: JSON.stringify({
          source: STARLING_SOURCE,
          sourceTransactionId: feedItem.feedItemUid,
          transactionDate: toIsoDateString(feedItem.transactionTime),
          creditedAccount: creditedAccount,
          debitedAccount: debitedAccount,
          skuOrPurchaseId: "",
          amount: feedItem.amount.minorUnits / 100,
          description: feedItem.reference,
          who: feedItem.counterPartyName,
        }),
        MessageAttributes: {
          transactionId: {
            DataType: "String",
            StringValue: transactionId,
          },
          ...additionalMessageAttributes,
        },
        TopicArn: TOPIC_ARN,
      })
      .promise();
    console.log(`Transaction ${transactionId} message sent`);
  }
};

const toIsoDateString = (isoDateTimeString) =>
  dateFormat(Date.parse(isoDateTimeString), ISO_DATE_MASK);
