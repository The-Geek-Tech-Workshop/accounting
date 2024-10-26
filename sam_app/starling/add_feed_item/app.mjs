import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import constants from "accounting_constants";

const eventBridgeClient = new EventBridgeClient();

export const lambdaHandler = async (event) => {
  await eventBridgeClient.send(
    new PutEventsCommand({
      Entries: [
        {
          Detail: event.body,
          DetailType: constants.MESSAGE.DETAIL_TYPE.STARLING_VERIFIED_FEEDITEM,
          Source: constants.MESSAGE.SOURCE.GTW_ACCOUNTING,
        },
      ],
    })
  );

  return {
    statusCode: 202,
  };
};
