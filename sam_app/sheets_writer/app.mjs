import google from "@googleapis/sheets";
import { GoogleAuth } from "google-auth-library";

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
  const auth = new GoogleAuth({ scopes: SCOPES });
  const client = await auth.getClient();

  const sheetsApi = google.sheets({ version: "v4", auth: client });

  const result1 = await sheetsApi.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: ["Transactions"],
  });
  const transactionsSheetId = result1.data.sheets[0].properties.sheetId;

  const creditedAccount = "GTW";
  const debitedAccount = "Equipment";
  const accountTypeFunction = "";
  const skuOrPurchaseId = "";

  // Insert new row and then sort all rows by date column
  const result = await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [
        {
          insertDimension: {
            // Transactions!A3:I3
            range: {
              sheetId: transactionsSheetId,
              dimension: "ROWS",
              startIndex: 2,
              endIndex: 3,
            },
            inheritFromBefore: true,
          },
        },
        {
          updateCells: {
            rows: [
              {
                values: [
                  event.transactionDate,
                  creditedAccount,
                  debitedAccount,
                  accountTypeFunction,
                  event.amount,
                  skuOrPurchaseId,
                  event.description,
                  event.who,
                ].map((v) => {
                  return {
                    formattedValue: `${v}`,
                  };
                }),
              },
            ],
            fields:
              "formattedValue,formattedValue,formattedValue,formattedValue,formattedValue,formattedValue,formattedValue,formattedValue",
            range: {
              sheetId: transactionsSheetId,
              startColumnIndex: 0,
              endColumnIndex: 8,
              startRowIndex: 2,
              endRowIndex: 3,
            },
          },
        },
      ],
    },
  });

  const response = {
    statusCode: result.status,
    body: JSON.stringify(result),
  };
  return response;
};
