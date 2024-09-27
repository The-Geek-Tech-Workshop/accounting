import dateFormat from "dateformat";
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
const STARLING_EBAY_NAMES = ["eBay", "EBAY Commerce UK Ltd"];

const STARLING_TRANSACTION_STATUS__DECLINED = "DECLINED";

const ebayOrderIdRegex = /^eBay O\*(?<orderId>.+)$/gm;
const ebayPayoutIdRegex = /^P\*(?<payoutId>.+)$/gm;

const personalData = JSON.parse(
  await readFile(new URL("personal.json", import.meta.url))
);

export const lambdaHandler = async (event) => {
  const webhook = event.detail;
  const feedItem = webhook.content;

  if (feedItem.status === STARLING_TRANSACTION_STATUS__DECLINED) {
    console.log("Transaction skipped: declined");
    return;
  }
  const newTransaction = await extractTransaction(
    webhook.accountHolderUid,
    feedItem
  );

  const outgoing = {
    Messages: [newTransaction],
  };

  console.log(JSON.stringify(outgoing));
  return outgoing;
};

const extractTransaction = async (accountHolderUid, feedItem) => {
  const transactionId = `${STARLING_SOURCE}-${feedItem.feedItemUid}`;
  const transactionWasOutgoing = feedItem.direction === "OUT";
  const starlingAccountName =
    STARLING_ACCOUNT_TO_BANK_ACCOUNT_NAME_MAPPING[accountHolderUid];

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
    Detail: {
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
        transactionId: transactionId,
        ...ebayHeaders,
      },
    },
    DetailType: "transaction",
  };
  return message;
};

const extractEbayHeaders = (transactionWasOutgoing, feedItem) => {
  const ebayOrderIdMatch = ebayOrderIdRegex.exec(feedItem.reference);

  const ebayOrderIdMessageAttribute =
    transactionWasOutgoing &&
    STARLING_EBAY_NAMES.includes(feedItem.counterPartyName) &&
    ebayOrderIdMatch
      ? {
          eBayOrderId: ebayOrderIdMatch.groups.orderId,
        }
      : {};

  const ebayPayoutIdMatch = ebayPayoutIdRegex.exec(feedItem.reference);
  const ebayPayoutIdMessageAttribute =
    !transactionWasOutgoing &&
    STARLING_EBAY_NAMES.includes(feedItem.counterPartyName) &&
    ebayPayoutIdMatch
      ? {
          eBayPayoutId: ebayPayoutIdMatch.groups.payoutId,
        }
      : {};
  return {
    ...ebayOrderIdMessageAttribute,
    ...ebayPayoutIdMessageAttribute,
  };
};

const toIsoDateString = (isoDateTimeString) =>
  dateFormat(Date.parse(isoDateTimeString), ISO_DATE_MASK);
