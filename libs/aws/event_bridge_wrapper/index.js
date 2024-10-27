import { PutEventsCommand } from "@aws-sdk/client-eventbridge";

const EVENT_BRIDGE_MAX_ENTRIES = 10;

export const sendMessages = async (client, messages) => {
  const messageGroups = chunks(messages, EVENT_BRIDGE_MAX_ENTRIES);
  for (const messageGroup of messageGroups) {
    await client.send(
      new PutEventsCommand({
        Entries: messageGroup,
      })
    );
  }
};

const chunks = (a, size) =>
  Array.from(new Array(Math.ceil(a.length / size)), (_, i) =>
    a.slice(i * size, i * size + size)
  );
