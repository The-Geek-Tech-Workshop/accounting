import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

const eventBridgeClient = new EventBridgeClient();

export const lambdaHandler = async (event) => {
  if (event.detail.responsePayload) {
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: event.detail.responsePayload.Messages.map((message) => {
          return {
            Detail: JSON.stringify(message.Detail),
            DetailType: message.DetailType,
            Source: "custom.gtw.accountingApp",
          };
        }),
      })
    );
  }
};
