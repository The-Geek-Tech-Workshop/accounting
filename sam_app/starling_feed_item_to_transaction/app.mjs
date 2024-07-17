import dateFormat from "dateformat";
import AWS from "aws-sdk";

const ISO_DATE_MASK = "isoDate";
const STARLING_BANK_ACCOUNT_NAME = "GTW";
const STARLING_SOURCE = "STARLING";
const QUEUE_URL = process.env.QUEUE_URL;

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 */

export const lambdaHandler = async (event) => {
  const feedItem = JSON.parse(event.Records[0].body).content;

  const transactionWasOutgoing = feedItem.direction === "OUT";
  const creditedAccount = transactionWasOutgoing
    ? STARLING_BANK_ACCOUNT_NAME
    : "";
  const debitedAccount = transactionWasOutgoing
    ? ""
    : STARLING_BANK_ACCOUNT_NAME;

  const sqs = new AWS.SQS();
  await sqs
    .sendMessage({
      MessageBody: JSON.stringify({
        source: STARLING_SOURCE,
        sourceTransactionId: feedItem.feedItemUid,
        transactionDate: toIsoDateString(feedItem.transactionTime),
        creditedAccount: creditedAccount,
        debitedAccount: debitedAccount,
        skuOrPurchaseId: "",
        amount: feedItem.amount.minorUnits / 100,
        description: "",
        who: feedItem.counterPartyName,
      }),
      QueueUrl: QUEUE_URL,
    })
    .promise();
};

const toIsoDateString = (isoDateTimeString) =>
  dateFormat(Date.parse(isoDateTimeString), ISO_DATE_MASK);
