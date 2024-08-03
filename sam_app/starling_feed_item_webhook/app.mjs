import { createPublicKey, verify } from "crypto";
import AWS from "aws-sdk";

const PUBLIC_KEY = createPublicKey(
  `-----BEGIN PUBLIC KEY-----\n${process.env.PUBLIC_KEY}\n-----END PUBLIC KEY-----`
);
const ENCRYPTION_ALGORITHM = "RSA-SHA512";
const QUEUE_URL = process.env.QUEUE_URL;

export const lambdaHandler = async (event) => {
  console.log(JSON.stringify(event));

  const verified = verifyEvent(event);

  if (verified) {
    const sqs = new AWS.SQS();
    await sqs
      .sendMessage({
        MessageBody: event.body,
        QueueUrl: QUEUE_URL,
      })
      .promise();
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
