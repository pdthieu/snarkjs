const fs = require("fs");
const { buildPoseidonOpt } = require("circomlibjs");
const { buildBabyjub } = require("circomlibjs");
const bigInt = require("./bigInt");

const chai = require("chai");
const assert = chai.assert;
const MAX_TXS = 5;
const MAX_LEN = 19;
const MAX_SIZE_POSEIDON = 7;

const run = async () => {
  const babyJub = await buildBabyjub();
  const F = babyJub.F;
  const poseidonJs = await buildPoseidonOpt();

  const listingId = 1;
  const sender = "0x0123456789abcdef01230123456789abcdef0123";
  const arrayLength = MAX_LEN;
  const tokenIds = Array.from(Array(arrayLength).keys()).map(
    (el, index) => index
  );
  const amounts = Array.from(Array(arrayLength).keys()).map(
    (el, index) => index * 10
  );

  const seperator = "0x0123456789abcdef00000123456789abcdef0000";

  const txs = Array.from(Array(MAX_TXS).keys()).map((el, index) => [
    sender,
    listingId,
    arrayLength,
    tokenIds,
    amounts.map((el) => el + index),
    index,
  ]);

  const hashPoseidon = (arr) => {
    let result = [];
    let i = 0;
    while (i < arr.length) {
      result.push(arr[i]);
      if (result.length === MAX_SIZE_POSEIDON) {
        result = [poseidonJs(result)];
      }
      i++;
    }
    if (result.length > 1) {
      result = [poseidonJs(result)];
    }

    return result[0];
  };

  const new_txs = txs.map((el) => {
    const el3 = "0x" + F.toObject(hashPoseidon(el[3])).toString(16);
    const el4 = "0x" + F.toObject(hashPoseidon(el[4])).toString(16);
    return [el[0], el[1], el[2], el3, el4, el[5]];
  });

  const txs_hashed = new_txs.map((el) =>
    poseidonJs([el[0], el[1], el[3], el[4]])
  );

  let operation_hash = seperator;
  txs_hashed.forEach((el) => {
    operation_hash = poseidonJs([operation_hash, el]);
  });

  const inputs = {
    seperator,
    txs: txs.map((el) => el.flat()),
    operation_hash: "0x" + F.toObject(operation_hash).toString(16),
  };

  fs.writeFileSync(
    "../src/inputs/operation-hash-input.json",
    JSON.stringify(inputs),
    "utf-8"
  );
};

run();
