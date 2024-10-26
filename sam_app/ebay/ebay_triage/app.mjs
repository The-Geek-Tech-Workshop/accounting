import constants from "accounting_constants";

const EBAY_ENRICHABLE_TRANSACTION_TYPES = [
  {
    detailType: constants.MESSAGE.DETAIL_TYPE.EBAY_TRANSACTION_ORDER,
    regex: /^eBay O\*(?<id>.+)$/gm,
  },
  {
    detailType: constants.MESSAGE.DETAIL_TYPE.EBAY_TRANSACTION_CHARGE,
    regex: /^eBay C (?<id>.+)$/gm,
  },
  {
    detailType: constants.MESSAGE.DETAIL_TYPE.EBAY_TRANSACTION_PAYOUT,
    regex: /^P\*(?<id>.+)$/gm,
  },
];

const checkForMatch = (transactionType, regexResult) =>
  regexResult
    ? { id: regexResult.groups.id, detailType: transactionType.detailType }
    : null;

export const lambdaHandler = async (event) => {
  const transaction = JSON.parse(event.detail.Message);

  const match = EBAY_ENRICHABLE_TRANSACTION_TYPES.reduce(
    (currentMatch, transactionType) =>
      currentMatch
        ? currentMatch
        : checkForMatch(
            transactionType,
            transactionType.regex.exec(transaction.description)
          ),
    null
  );

  return {
    Messages: [
      {
        Detail: {
          Message: event.detail.Message,
          MessageAttributes: {
            ...(event.detail.MessageAttributes || {}),
            ...(match
              ? {
                  ebayId: match.id,
                }
              : {
                  isEnriched: true,
                }),
          },
        },
        DetailType: match
          ? match.detailType
          : constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
      },
    ],
  };
};
