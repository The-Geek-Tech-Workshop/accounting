import { createPublicKey, verify } from "crypto";

const publicKey = createPublicKey(process.env.PUBLIC_KEY);

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
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      verified: verified,
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
    publicKey,
    Buffer.from(payloadSignatureBase64, "base64")
  );
};
