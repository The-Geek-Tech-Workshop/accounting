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

  const sheetResult = await sheetsApi.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: ["Transactions"],
  });
  const transactionsSheetId = sheetResult.data.sheets[0].properties.sheetId;

  const rowResult = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    valueRenderOption: "FORMULA",
    range: "Transactions!A3:I3",
  });

  const existingRow = rowResult.data.values[0];

  const creditedAccount = "GTW";
  const debitedAccount = "Equipment";
  const skuOrPurchaseId = "";

  // Insert new row and then sort all rows by date column
  await sheetsApi.spreadsheets.batchUpdate({
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
      ],
    },
  });

  const result = await sheetsApi.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "Transactions!A3:I3",
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [
        [
          event.transactionDate,
          creditedAccount,
          existingRow[2],
          debitedAccount,
          existingRow[4],
          event.amount,
          skuOrPurchaseId,
          event.description,
          event.who,
        ],
      ],
    },
  });

  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [
        {
          sortRange: {
            range: {
              sheetId: transactionsSheetId,
            },
            sortSpecs: [
              {
                dimensionIndex: 0,
                sortOrder: "DESCENDING",
              },
            ],
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
