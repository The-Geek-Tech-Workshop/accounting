import { createPublicKey, verify } from "crypto";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import constants from "accounting_constants";

const PUBLIC_KEY = createPublicKey(
  `-----BEGIN PUBLIC KEY-----\n${process.env.PUBLIC_KEY}\n-----END PUBLIC KEY-----`
);
const ENCRYPTION_ALGORITHM = "RSA-SHA512";

const eventBridgeClient = new EventBridgeClient();

export const lambdaHandler = async (event) => {
  console.log(JSON.stringify(event));

  const verified = verifyEvent(event);

  if (verified) {
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Detail: event.body,
            DetailType:
              constants.MESSAGE.DETAIL_TYPE.STARLING_VERIFIED_FEEDITEM,
            Source: constants.MESSAGE.SOURCE.GTW_ACCOUNTING,
          },
        ],
      })
    );
  } else {
    console.error("Message verification failed");
  }

  return verified
    ? {
        statusCode: 202,
      }
    : {
        statusCode: 400,
        body: JSON.stringify({
          error: "Integrity of message signature could not be verified",
        }),
      };
};

const verifyEvent = (event) => {
  const payload = event.body;
  const payloadSignatureBase64 = event.headers["X-Hook-Signature"];
  return verify(
    ENCRYPTION_ALGORITHM,
    Buffer.from(payload, "utf-8"),
    PUBLIC_KEY,
    Buffer.from(payloadSignatureBase64, "base64")
  );
};
