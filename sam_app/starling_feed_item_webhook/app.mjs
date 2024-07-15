import { createPublicKey, verify } from "crypto";

const PUBLIC_KEY = createPublicKey(
  `-----BEGIN PUBLIC KEY-----\n${process.env.PUBLIC_KEY}\n-----END PUBLIC KEY-----`
);
const ENCRYPTION_ALGORITHM = "RSA-SHA512";

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (event, context) => {
  const verified = verifyEvent(event);

  console.log(`EVENT: ${JSON.stringify(event)}`);

  const response = verified
    ? {
        statusCode: 200,
        body: JSON.stringify({
          feedItem: event.body,
        }),
      }
    : {
        statusCode: 400,
        body: JSON.stringify({
          error: "Integrity of message signature could not be verified",
        }),
      };

  return response;
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
