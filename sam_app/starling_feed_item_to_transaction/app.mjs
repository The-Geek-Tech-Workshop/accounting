import dateFormat from "dateformat";
import AWS from "aws-sdk";

const ISO_DATE_MASK = "isoDate";
const STARLING_BANK_ACCOUNT_NAME = "GTW";
const STARLING_SOURCE = "STARLING";
const TOPIC_ARN = process.env.TOPIC_ARN;
const STARLING_EBAY_NAME = "eBay";

const ebayOrderIdRegex = /^eBay O\*(?<orderId>.+)$/gm;
const ebayPayoutIdRegex = /^P\*(?<payoutId>.+)$/gm;
const sns = new AWS.SNS();

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

    const ebayOrderIdMessageAttribute =
      transactionWasOutgoing && feedItem.counterPartyName === STARLING_EBAY_NAME
        ? {
            eBayOrderId: {
              DataType: "String",
              StringValue: ebayOrderIdRegex.exec(feedItem.reference).groups
                .orderId,
            },
          }
        : {};
    const ebayPayoutIdMessageAttribute =
      !transactionWasOutgoing &&
      feedItem.counterPartyName === STARLING_EBAY_NAME
        ? {
            eBayPayoutId: {
              DataType: "String",
              StringValue: ebayPayoutIdRegex.exec(feedItem.reference).groups
                .payoutId,
            },
          }
        : {};

    const message = {
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
        ...ebayOrderIdMessageAttribute,
        ...ebayPayoutIdMessageAttribute,
      },
      TopicArn: TOPIC_ARN,
    };
    await sns.publish(message).promise();
  }
};

const toIsoDateString = (isoDateTimeString) =>
  dateFormat(Date.parse(isoDateTimeString), ISO_DATE_MASK);
