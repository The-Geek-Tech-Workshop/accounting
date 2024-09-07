import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
// Set up Google Sheets API credentials
const auth = new google.auth.GoogleAuth({
  scopes: SCOPES,
});

// Create Google Sheets client
const sheets = google.sheets({ version: "v4", auth });

// Function to format date from ISO 8601 string to DD/MM/YYYY
const formatDate = (isoString) => {
  const date = new Date(isoString);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export const handler = async (event) => {
  try {
    // Parse the SNS message
    const snsMessage = event.Records[0].Sns.Message;
    const { sku, deliveryDate } = JSON.parse(snsMessage);

    // Validate input
    if (!sku || !deliveryDate) {
      console.error("Invalid input: SKU and deliveryDate are required");
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid input" }),
      };
    }

    // Format the date to DD/MM/YYYY
    const formattedDate = formatDate(deliveryDate);

    // Get the 'Sales' sheet data
    const {
      data: { values: rows },
    } = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sales!A:G",
    });

    // Find the row with matching SKU
    const rowIndex = rows.findIndex((row) => row[0] === sku);

    if (rowIndex === -1) {
      console.log(`SKU ${sku} not found`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "SKU not found" }),
      };
    }

    // Update the delivery date in column G
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sales!G${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [[formattedDate]],
      },
    });

    console.log(
      `Successfully updated delivery date for SKU ${sku} to ${formattedDate}`
    );
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Delivery date updated successfully" }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
