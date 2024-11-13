import google from "@googleapis/sheets";
import { GoogleAuth } from "google-auth-library";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const TRANSACTION_ID_METADATA_KEY = "transactionId";
const ENRICHED_TRANSACTION_ID_METADATA_KEY = "enrichedTransactionId";
const NEW_ROW_NUMBER = 3;
const a1RangeRowNumber = NEW_ROW_NUMBER;
const a1Range = `Transactions!A${a1RangeRowNumber}:I${a1RangeRowNumber}`;

const auth = new GoogleAuth({
  scopes: SCOPES,
  targetPrincipal: process.env.GOOGLE_SERVICE_ACCOUNT,
  audience: process.env.GOOGLE_AUDIENCE,
  useWorkloadIdentityFederation: true,
});
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

export const lambdaHandler = async (event) => {
  const transaction = event.detail;
  const transactionId = `${transaction.source}-${transaction.sourceTransactionId}`;
  console.log(`Transaction: ${transactionId}`);

  const { hasBeenWritten, hasBeenWrittenEnriched, rowAlreadyWrittenTo } =
    await getExistingRowMetadata(transactionId);

  if (hasBeenWrittenEnriched || (hasBeenWritten && !transaction.isEnriched)) {
    console.log(
      `Transaction ${transactionId} (enriched: ${!!hasBeenWrittenEnriched}) already exists. Skipping...`
    );
    return;
  }

  const rowToUpdate = rowAlreadyWrittenTo || NEW_ROW_NUMBER;

  const updateCellsRequest = {
    updateCells: {
      range: {
        sheetId: transactionsSheetId,
        startRowIndex: rowToUpdate - 1,
        endRowIndex: rowToUpdate,
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

  const metadataKeyToWrite = transaction.isEnriched
    ? ENRICHED_TRANSACTION_ID_METADATA_KEY
    : TRANSACTION_ID_METADATA_KEY;

  const createDeveloperMetadataRequest = {
    createDeveloperMetadata: {
      developerMetadata: {
        metadataKey: metadataKeyToWrite,
        metadataValue: transactionId,
        location: {
          dimensionRange: {
            sheetId: transactionsSheetId,
            dimension: "ROWS",
            startIndex: rowToUpdate - 1,
            endIndex: rowToUpdate,
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
        ...(rowAlreadyWrittenTo ? [] : [createNewRowRequest]),
        updateCellsRequest,
        createDeveloperMetadataRequest,
        sortRowsRequest,
      ],
    },
  });
};

const getExistingRowMetadata = async (transactionId) => {
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
          {
            developerMetadataLookup: {
              metadataKey: ENRICHED_TRANSACTION_ID_METADATA_KEY,
              metadataValue: transactionId,
            },
          },
        ],
      },
    });

  const matches = existingTransactionResult.data.matchedDeveloperMetadata || [];

  return {
    hasBeenWritten: matches.length > 0,
    hasBeenWrittenEnriched:
      matches.filter(
        (match) =>
          match.developerMetadata.metadataKey ===
          ENRICHED_TRANSACTION_ID_METADATA_KEY
      ).length > 0,
    rowAlreadyWrittenTo:
      matches.length > 0
        ? matches[0].developerMetadata.location.dimensionRange.startIndex + 1
        : null,
  };
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
