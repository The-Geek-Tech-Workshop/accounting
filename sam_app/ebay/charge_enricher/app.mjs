import constants from "accounting_constants";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { sendMessages } from "event_bridge_wrapper";

const eventBridgeClient = new EventBridgeClient();

const idRegex = /^eBay C (?<id>.+)$/m;

export const lambdaHandler = async (event) => {
  const transaction = event.detail;
  const ebayChargeId = idRegex.exec(transaction.description).groups.id;

  await sendMessages(eventBridgeClient, [
    {
      Detail: JSON.stringify({
        ...transaction,
        isEnriched: true,
        debitedAccount: constants.ACCOUNT.EBAY,
        description: `Charge ${ebayChargeId}`,
      }),
      DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
      Source: constants.MESSAGE.SOURCE.GTW_ACCOUNTING,
    },
  ]);
};
