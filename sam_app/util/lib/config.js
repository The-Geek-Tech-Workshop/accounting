export default {
  accounting: {
    url: "https://hn93t12th7.execute-api.eu-west-2.amazonaws.com/Prod",
    apiKey: process.env.ACCOUNTING_API_KEY,
  },
  starling: {
    url: "https://api.starlingbank.com/api/v2",
    accessToken: process.env.STARLING_PERSONAL_TOKEN,
  },
};
