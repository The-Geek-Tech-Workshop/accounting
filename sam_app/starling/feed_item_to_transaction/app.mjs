import { readFile } from "fs/promises";
import constants from "accounting_constants";
import { DateTime } from "luxon";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { sendMessages } from "event_bridge_wrapper";

const STARLING_ACCOUNT_TO_BANK_ACCOUNT_NAME_MAPPING = {
  "16561956-bd87-4f9e-bb2b-0428e6c42b15": constants.ACCOUNT.STARLING_BUSINESS,
};
const SKU_OR_PURCHASE_ID__NA = "N/A";

const STARLING_TRANSACTION_STATUS__DECLINED = "DECLINED";

const personalData = JSON.parse(
  await readFile(new URL("personal.json", import.meta.url))
);

const eventBridgeClient = new EventBridgeClient();

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

  await sendMessages(eventBridgeClient, [newTransaction]);
};

const extractTransaction = async (accountHolderUid, feedItem) => {
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
    ? constants.ACCOUNT.CAPITAL
    : "";
  const debitedAccount = transactionWasOutgoing
    ? otherIsPersonalBankAccount
      ? constants.ACCOUNT.DRAWINGS
      : ""
    : starlingAccountName;

  const skuOrPurchaseId = otherIsPersonalBankAccount
    ? SKU_OR_PURCHASE_ID__NA
    : "";

  const message = {
    Detail: JSON.stringify({
      source: constants.ACCOUNTING.SOURCE.STARLING,
      sourceTransactionId: feedItem.feedItemUid,
      transactionDate: DateTime.fromISO(feedItem.transactionTime).toISODate(),
      creditedAccount: creditedAccount,
      debitedAccount: debitedAccount,
      skuOrPurchaseId: skuOrPurchaseId,
      amount: feedItem.amount.minorUnits / 100,
      description: feedItem.reference,
      who: feedItem.counterPartyName,
    }),
    DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
    Source: constants.MESSAGE.SOURCE.GTW_ACCOUNTING,
  };
  return message;
};
