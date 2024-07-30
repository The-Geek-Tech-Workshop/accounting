import dateFormat from "dateformat";
import AWS from "aws-sdk";

const ISO_DATE_MASK = "isoDate";
const STARLING_BANK_ACCOUNT_NAME = "GTW";
const STARLING_SOURCE = "STARLING";
const TOPIC_ARN = process.env.TOPIC_ARN;
const EBAY_STARLING_UID = "ae3f1752-1bf2-4bf5-8a03-2fad3dc3d468";

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
      transactionWasOutgoing && feedItem.counterPartyUid === EBAY_STARLING_UID
        ? {
            ebayOrderId: {
              DataType: "String",
              StringValue: ebayOrderIdRegex.match(feedItem.reference).orderId,
            },
          }
        : {};
    const ebayPayoutIdMessageAttribute =
      !transactionWasOutgoing && feedItem.counterPartyUid === EBAY_STARLING_UID
        ? {
            ebayPayoutId: {
              DataType: "String",
              StringValue: ebayPayoutIdRegex.match(feedItem.reference).payoutId,
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
          ...ebayOrderIdMessageAttribute,
          ...ebayPayoutIdMessageAttribute,
        },
        TopicArn: TOPIC_ARN,
      })
      .promise();
    console.log(`Transaction ${transactionId} message sent`);
  }
};

const toIsoDateString = (isoDateTimeString) =>
  dateFormat(Date.parse(isoDateTimeString), ISO_DATE_MASK);
