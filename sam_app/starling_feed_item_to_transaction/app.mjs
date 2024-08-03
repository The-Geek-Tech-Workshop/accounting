import dateFormat from "dateformat";
import AWS from "aws-sdk";

const ISO_DATE_MASK = "isoDate";
const STARLING_ACCOUNT_TO_BANK_ACCOUNT_NAME_MAPPING = {
  "eee4ab30-7ac7-4495-8c21-83090126f2e5": "GTW",
  "16561956-bd87-4f9e-bb2b-0428e6c42b15": "Starling (Business)",
};
const STARLING_BANK_ACCOUNT_NAME = "GTW";
const STARLING_BUSINESS_BANK_ACCOUNT_NAME = "Starling (Business)";
const STARLING_SOURCE = "STARLING";
const TOPIC_ARN = process.env.TOPIC_ARN;
const STARLING_EBAY_NAMES = ["eBay", "EBAY Commerce UK Ltd"];

const ebayOrderIdRegex = /^eBay O\*(?<orderId>.+)$/gm;
const ebayPayoutIdRegex = /^P\*(?<payoutId>.+)$/gm;
const sns = new AWS.SNS();

export const lambdaHandler = async (event) => {
  for (const record of event.Records) {
    const webhook = JSON.parse(record.body);
    const feedItem = webhook.content;

    const transactionId = `${STARLING_SOURCE}-${feedItem.feedItemUid}`;
    const transactionWasOutgoing = feedItem.direction === "OUT";
    const starlingAccountName =
      STARLING_ACCOUNT_TO_BANK_ACCOUNT_NAME_MAPPING[webhook.accountHolderUid];

    const creditedAccount = transactionWasOutgoing ? starlingAccountName : "";
    const debitedAccount = transactionWasOutgoing ? "" : starlingAccountName;

    const ebayOrderIdMessageAttribute =
      transactionWasOutgoing &&
      STARLING_EBAY_NAMES.includes(feedItem.counterPartyName)
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
      STARLING_EBAY_NAMES.includes(feedItem.counterPartyName)
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
