#!/usr/bin/env node

import { handleTransactions } from "./app.js";
import { program } from "commander";

const app = program.version("1.0.0", "-v, --version");

app
  .command("transactions")
  .alias("tx")
  .description("Retrieve transaction data")
  .option("-f --date-from <string>", "Transactions from this date (ISO)")
  .option("-t --date-to <string>", "Transactions up until this date (ISO)")
  .option("-y --type <string>", "Transactions type")
  .option("-o --offset <number>", "Results offset")
  .option("-l --limit <number>", "Results limit")
  .option("-r --raw", "Output raw JSON from API")
  .option("-i --ids", "Display transaction IDs")
  .action(handleTransactions);

app.parseAsync(process.argv);
