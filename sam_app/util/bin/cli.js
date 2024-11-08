#!/usr/bin/env node
import { program } from "commander";
import { addStarlingTransaction } from "../lib/commands/addStarlingTransaction.js";
import { fetchEbayTransactions } from "../lib/commands/fetchEbayTransactions.js";

const app = program.version("1.0.0", "-v --version");

const add = app.command("add").alias("a");
const addStarling = add.command("starling");
addStarling
  .command("feed-item")
  .alias("fi")
  .description("Add a feed-item from Starling")
  .argument("<account-id>", "UUID for the account to add from")
  .argument("<category-id>", "UUID for the category to add")
  .argument("<feed-item-id>", "UUID for the feed-item to add")
  .action(async (accountUid, categoryUid, feedItemUid) =>
    addStarlingTransaction({ accountUid, categoryUid, feedItemUid })
  );

const fetch = app.command("fetch").alias("f");
const fetchEbay = fetch.command("ebay");
fetchEbay
  .command("transactions")
  .alias("tx")
  .description("Trigger fetching transactions for a single day from eBay")
  .argument("<date>", "Date to fetch transactions for")
  .action(async (date) => {
    fetchEbayTransactions(date);
  });

app.parseAsync(process.argv);
