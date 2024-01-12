const fs = require("fs");
const { buildPoseidonOpt } = require("circomlibjs");
const { buildBabyjub } = require("circomlibjs");
const { buildPoseidonMerkle } = require("./PoseidonMerkle");
const bigInt = require("./bigInt");

const chai = require("chai");
const assert = chai.assert;

const run = async () => {
  const babyJub = await buildBabyjub();
  const F = babyJub.F;
  const poseidonJs = await buildPoseidonOpt();
  const poseidonMerkle = await buildPoseidonMerkle();
  const depth = 3;

  // const num1 = 1;
  // const num2 = 2;

  // const result = poseidonJs([num1, num2]);
  // console.log([num1, num2]);
  // console.log(bigInt(F.toObject(result).toString()));

  // return;

  const leaf1 = [1, "0x0123456789abcdef00000123456789abcdef0000", 3, 4];
  const leaf2 = [2, "0x0123456789abcdef00000123456789abcdef0000", 3, 4];
  const leaf3 = [3, "0x0123456789abcdef00000123456789abcdef0000", 3, 4];
  const leaf4 = [4, "0x0123456789abcdef00000123456789abcdef0000", 3, 4];

  const leafs = [
    [leaf1, leaf2, leaf3],
    Array.from(Array(2 ** depth - 3).keys()).map((_el) => leaf4),
  ].flat();

  // 2^k elements
  const leafArray = leafs.map((el) => poseidonJs(el));

  const tree = poseidonMerkle.treeFromLeafArray(leafArray);
  let root = tree[0];
  while (Array.isArray(root)) {
    root = root[0];
  }
  const inputs = {
    balances: leafs,
    root: "0x" + F.toObject(root).toString(16),
  };

  fs.writeFileSync(
    "../src/inputs/merkle-root-input.json",
    JSON.stringify(inputs),
    "utf-8"
  );
};

run();
