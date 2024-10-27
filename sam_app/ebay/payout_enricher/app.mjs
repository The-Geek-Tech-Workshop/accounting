import constants from "accounting_constants";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { sendMessages } from "event_bridge_wrapper";

const eventBridgeClient = new EventBridgeClient();

const idRegex = /^P\*(?<id>.+)$/m;

export const lambdaHandler = async (event) => {
  const transaction = event.detail;
  const ebayPayoutId = idRegex.exec(transaction.description).groups.id;

  await sendMessages(eventBridgeClient, [
    {
      Detail: JSON.stringify({
        ...transaction,
        isEnriched: true,
        creditedAccount: constants.ACCOUNT.EBAY,
        description: `Payout ${ebayPayoutId}`,
      }),
      DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
      Source: constants.MESSAGE.SOURCE.GTW_ACCOUNTING,
    },
  ]);
};
