import dateFormat from "dateformat";
import AWS from "aws-sdk";
import { readFile } from "fs/promises";

const ISO_DATE_MASK = "isoDate";
const STARLING_BANK_ACCOUNT_NAME = "GTW";
const STARLING_BUSINESS_BANK_ACCOUNT_NAME = "Starling (Business)";
const ACCOUNT_NAME__CAPITAL = "Capital";
const ACCOUNT_NAME__DRAWINGS = "Drawings";
const STARLING_ACCOUNT_TO_BANK_ACCOUNT_NAME_MAPPING = {
  "eee4ab30-7ac7-4495-8c21-83090126f2e5": STARLING_BANK_ACCOUNT_NAME,
  "16561956-bd87-4f9e-bb2b-0428e6c42b15": STARLING_BUSINESS_BANK_ACCOUNT_NAME,
};
const SKU_OR_PURCHASE_ID__NA = "N/A";
const STARLING_SOURCE = "STARLING";
const TOPIC_ARN = process.env.TOPIC_ARN;
const STARLING_EBAY_NAMES = ["eBay", "EBAY Commerce UK Ltd"];

const ebayOrderIdRegex = /^eBay O\*(?<orderId>.+)$/gm;
const ebayPayoutIdRegex = /^P\*(?<payoutId>.+)$/gm;
const sns = new AWS.SNS();

const personalData = JSON.parse(
  await readFile(new URL("personal.json", import.meta.url))
);

export const lambdaHandler = async (event) => {
  for (const record of event.Records) {
    const webhook = JSON.parse(record.body);
    const feedItem = webhook.content;

    const transactionId = `${STARLING_SOURCE}-${feedItem.feedItemUid}`;
    const transactionWasOutgoing = feedItem.direction === "OUT";
    const starlingAccountName =
      STARLING_ACCOUNT_TO_BANK_ACCOUNT_NAME_MAPPING[webhook.accountHolderUid];

    const otherIsPersonalBankAccount =
      feedItem.counterPartySubEntityIdentifier ===
        personalData.bankAccount.sortCode &&
      feedItem.counterPartySubEntitySubIdentifier ===
        personalData.bankAccount.accountNumber;

    const creditedAccount = transactionWasOutgoing
      ? starlingAccountName
      : otherIsPersonalBankAccount
      ? ACCOUNT_NAME__CAPITAL
      : "";
    const debitedAccount = transactionWasOutgoing
      ? otherIsPersonalBankAccount
        ? ACCOUNT_NAME__DRAWINGS
        : ""
      : starlingAccountName;

    const skuOrPurchaseId = otherIsPersonalBankAccount
      ? SKU_OR_PURCHASE_ID__NA
      : "";

    const ebayHeaders = extractEbayHeaders(transactionWasOutgoing, feedItem);

    const message = {
      Message: JSON.stringify({
        source: STARLING_SOURCE,
        sourceTransactionId: feedItem.feedItemUid,
        transactionDate: toIsoDateString(feedItem.transactionTime),
        creditedAccount: creditedAccount,
        debitedAccount: debitedAccount,
        skuOrPurchaseId: skuOrPurchaseId,
        amount: feedItem.amount.minorUnits / 100,
        description: feedItem.reference,
        who: feedItem.counterPartyName,
      }),
      MessageAttributes: {
        transactionId: {
          DataType: "String",
          StringValue: transactionId,
        },
        ...ebayHeaders,
      },
      TopicArn: TOPIC_ARN,
    };
    await sns.publish(message).promise();
  }
};

const extractEbayHeaders = (transactionWasOutgoing, feedItem) => {
  const ebayOrderIdMatch = ebayOrderIdRegex.exec(feedItem.reference);

  const ebayOrderIdMessageAttribute =
    transactionWasOutgoing &&
    STARLING_EBAY_NAMES.includes(feedItem.counterPartyName) &&
    ebayOrderIdMatch
      ? {
          eBayOrderId: {
            DataType: "String",
            StringValue: ebayOrderIdMatch.groups.orderId,
          },
        }
      : {};

  const ebayPayoutIdMatch = ebayPayoutIdRegex.exec(feedItem.reference);
  const ebayPayoutIdMessageAttribute =
    !transactionWasOutgoing &&
    STARLING_EBAY_NAMES.includes(feedItem.counterPartyName) &&
    ebayPayoutIdMatch
      ? {
          eBayPayoutId: {
            DataType: "String",
            StringValue: ebayPayoutIdMatch.groups.payoutId,
          },
        }
      : {};
  return {
    ...ebayOrderIdMessageAttribute,
    ...ebayPayoutIdMessageAttribute,
  };
};

const toIsoDateString = (isoDateTimeString) =>
  dateFormat(Date.parse(isoDateTimeString), ISO_DATE_MASK);
