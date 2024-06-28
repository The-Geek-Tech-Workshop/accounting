import { createVerify } from "crypto";

const publicKey = process.env.PUBLIC_KEY;

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
  const verifier = createVerify("RSA-SHA256");
  verifier.update(input);
  verifier.verify(
    Buffer.from(publicKey),
    Buffer.from(event.headers["X-Hook-Signature"])
  );

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      verified: verified,
    }),
  };

  return response;
};
