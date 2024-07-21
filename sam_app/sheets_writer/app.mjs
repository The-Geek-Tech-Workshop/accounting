import google from "@googleapis/sheets";
import { GoogleAuth } from "google-auth-library";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const TRANSACTION_ID_METADATA_KEY = "transactionId";
const NEW_ROW_NUMBER = 3;

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} transaction - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (event) => {
  const transaction = JSON.parse(event.Records[0].body);
  const transactionId = `${transaction.source}-${transaction.sourceTransactionId}`;

  const auth = new GoogleAuth({ scopes: SCOPES });
  const client = await auth.getClient();

  const sheetsApi = google.sheets({ version: "v4", auth: client });

  const sheetResult = await sheetsApi.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: ["Transactions"],
  });
  const transactionsSheetId = sheetResult.data.sheets[0].properties.sheetId;

  const existingTransactionResult =
    await sheetsApi.spreadsheets.developerMetadata.search({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        dataFilters: [
          {
            developerMetadataLookup: {
              metadataKey: TRANSACTION_ID_METADATA_KEY,
              metadataValue: transactionId,
            },
          },
        ],
      },
    });
  const existingTransaction =
    Object.keys(existingTransactionResult.data).length > 0
      ? existingTransactionResult.data.matchedDeveloperMetadata[0]
      : null;

  const a1RangeRowNumber = existingTransaction
    ? existingTransaction.developerMetadata.location.dimensionRange.endIndex
    : NEW_ROW_NUMBER;
  const a1Range = `Transactions!A${a1RangeRowNumber}:I${a1RangeRowNumber}`;

  const rowResult = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    valueRenderOption: "FORMULA",
    range: a1Range,
  });

  const existingRow = rowResult.data.values[0];
  const creditedAccountAssetLookupFunction = existingRow[2];
  const debitedAccountAssetLookupFunction = existingRow[4];

  if (!existingTransaction) {
    // Insert new row
    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: transactionsSheetId,
                dimension: "ROWS",
                startIndex: NEW_ROW_NUMBER - 1,
                endIndex: NEW_ROW_NUMBER,
              },
              inheritFromBefore: true,
            },
          },
        ],
      },
    });
  }

  await sheetsApi.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: a1Range,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [
        [
          transaction.transactionDate,
          transaction.creditedAccount,
          creditedAccountAssetLookupFunction,
          transaction.debitedAccount,
          debitedAccountAssetLookupFunction,
          transaction.amount,
          transaction.skuOrPurchaseId,
          transaction.description,
          transaction.who,
        ],
      ],
    },
  });

  const createDeveloperMetadataRequest = {
    createDeveloperMetadata: {
      developerMetadata: {
        metadataKey: TRANSACTION_ID_METADATA_KEY,
        metadataValue: transactionId,
        location: {
          dimensionRange: {
            sheetId: transactionsSheetId,
            dimension: "ROWS",
            startIndex: NEW_ROW_NUMBER - 1,
            endIndex: NEW_ROW_NUMBER,
          },
        },
        visibility: "DOCUMENT",
      },
    },
  };

  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [
        ...(existingTransaction ? [] : [createDeveloperMetadataRequest]),
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
};
