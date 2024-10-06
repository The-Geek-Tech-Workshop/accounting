import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

const eventBridgeClient = new EventBridgeClient();

const EVENT_BRIDGE_MAX_ENTRIES = 10;

export const lambdaHandler = async (event) => {
  if (event.detail.responsePayload) {
    const messages = event.detail.responsePayload.Messages.map((message) => {
      return {
        Detail: JSON.stringify(message.Detail),
        DetailType: message.DetailType,
        Source: "custom.gtw.accountingApp",
      };
    });
    const messageGroups = chunks(messages, EVENT_BRIDGE_MAX_ENTRIES);
    for (const messageGroup of messageGroups) {
      await eventBridgeClient.send(
        new PutEventsCommand({
          Entries: messageGroup,
        })
      );
    }
  }
};

const chunks = (a, size) =>
  Array.from(new Array(Math.ceil(a.length / size)), (_, i) =>
    a.slice(i * size, i * size + size)
  );
