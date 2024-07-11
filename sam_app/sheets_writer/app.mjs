import google from "@googleapis/sheets";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

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
  const response = {
    statusCode: 200,
    body: JSON.stringify({}),
  };

  const sheetsApi = google.sheets({ version: "v4" });

  const creditedAccount = "GTW";
  const debitedAccount = "Equipment";
  const accountTypeFunction = "";
  const skuOrPurchaseId = "";

  console.log(`SS-ID: ${SPREADSHEET_ID}`);

  // Insert new row and then sort all rows by date column
  const result = await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: [
      {
        insertRange: {
          range: "Transactions!A3:I3",
          shiftDimension: "ROWS",
        },
      },
      {
        updateCells: {
          rows: [
            {
              rows: [
                event.transactionDate,
                creditedAccount,
                debitedAccount,
                accountTypeFunction,
                event.amount,
                skuOrPurchaseId,
                event.description,
                event.who,
              ],
            },
          ],
          fields: "*",
          range: "Transactions!A3:I3",
        },
      },
    ],
  });

  return response;
};
