import google from "@googleapis/sheets";
import { GoogleAuth } from "google-auth-library";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const TRANSACTION_ID_METADATA_KEY = "transactionId";
const NEW_ROW_NUMBER = 3;
const a1RangeRowNumber = NEW_ROW_NUMBER;
const a1Range = `Transactions!A${a1RangeRowNumber}:I${a1RangeRowNumber}`;

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
  range: a1Range,
});
const existingRow = rowResult.data.values[0];
const creditedAccountAssetLookupFunction = existingRow[2];
const debitedAccountAssetLookupFunction = existingRow[4];

export const lambdaHandler = async (event) => {
  console.log(JSON.stringify(event));
  const transaction = JSON.parse(event.detail.Message);
  const transactionId = `${transaction.source}-${transaction.sourceTransactionId}`;
  console.log(`Transaction: ${transactionId}`);

  if (await doesTransactionAlreadyExist(transactionId)) {
    console.log(`Transaction ${transactionId} already exists. Skipping...`);
    return;
  }

  const createNewRowRequest = {
    insertDimension: {
      range: {
        sheetId: transactionsSheetId,
        dimension: "ROWS",
        startIndex: NEW_ROW_NUMBER - 1,
        endIndex: NEW_ROW_NUMBER,
      },
      inheritFromBefore: true,
    },
  };

  const updateCellsRequest = {
    updateCells: {
      range: {
        sheetId: transactionsSheetId,
        startRowIndex: NEW_ROW_NUMBER - 1,
        endRowIndex: NEW_ROW_NUMBER,
      },
      fields: "userEnteredValue",
      rows: [
        {
          values: [
            {
              userEnteredValue: {
                numberValue: serialNumberFormatDate(
                  new Date(transaction.transactionDate)
                ),
              },
            },
            {
              userEnteredValue: { stringValue: transaction.creditedAccount },
            },
            {
              userEnteredValue: {
                formulaValue: creditedAccountAssetLookupFunction,
              },
            },
            {
              userEnteredValue: { stringValue: transaction.debitedAccount },
            },
            {
              userEnteredValue: {
                formulaValue: debitedAccountAssetLookupFunction,
              },
            },
            {
              userEnteredValue: { numberValue: transaction.amount },
            },
            {
              userEnteredValue: { stringValue: transaction.skuOrPurchaseId },
            },
            {
              userEnteredValue: { stringValue: transaction.description },
            },
            {
              userEnteredValue: { stringValue: transaction.who },
            },
          ],
        },
      ],
    },
  };

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

  const sortRowsRequest = {
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
  };

  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [
        createNewRowRequest,
        updateCellsRequest,
        createDeveloperMetadataRequest,
        sortRowsRequest,
      ],
    },
  });
};

const doesTransactionAlreadyExist = async (transactionId) => {
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

  return Object.keys(existingTransactionResult.data).length > 0;
};

const MILLISECONDS_IN_A_DAY = 1000 * 3600 * 24;
const MILLISECONDS_IN_AN_HOUR = 60 * 1000;
const DAYS_BETWEEN_SERIAL_NUMBER_FORMAT_EPOCH_AND_JAVASCRIPT_DATE_EPOCH = 25569.0;

const serialNumberFormatDate = (date) =>
  Math.round(
    DAYS_BETWEEN_SERIAL_NUMBER_FORMAT_EPOCH_AND_JAVASCRIPT_DATE_EPOCH +
      (date.getTime() - date.getTimezoneOffset() * MILLISECONDS_IN_AN_HOUR) /
        MILLISECONDS_IN_A_DAY
  );
