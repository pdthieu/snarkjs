const fs = require("fs");
const { buildPoseidonOpt } = require("circomlibjs");
const { buildBabyjub } = require("circomlibjs");
const { buildPoseidonMerkle } = require("./PoseidonMerkle");

const chai = require("chai");
const assert = chai.assert;

const run = async () => {
  const babyJub = await buildBabyjub();
  const F = babyJub.F;
  const poseidonJs = await buildPoseidonOpt();
  const poseidonMerkle = await buildPoseidonMerkle();
  const depth = 3;
  const index = 0;

  const leaf1 = [1, "0x0123456789abcdef00000123456789abcdef0000", 3, 4];
  const leaf2 = [2, "0x0123456789abcdef00000123456789abcdef0000", 3, 4];
  const leaf3 = [3, "0x0123456789abcdef00000123456789abcdef0000", 3, 4];
  const leaf4 = [4, "0x0123456789abcdef00000123456789abcdef0000", 3, 4];

  // 2^k elements
  const leafArray = [
    [leaf1, leaf2, leaf3],
    Array.from(Array(2 ** depth - 3).keys()).map((_el) => leaf4),
  ]
    .flat()
    .map((el) => poseidonJs(el));

  const tree = poseidonMerkle.treeFromLeafArray(leafArray);
  let root = tree[0];
  while (Array.isArray(root)) {
    root = root[0];
  }
  const proofs = poseidonMerkle.getProof(index, tree, leafArray);
  const pos = poseidonMerkle.generateMerklePosArray(depth)[index];

  assert(poseidonMerkle.verifyProof(leafArray[index], index, proofs, root));

  const inputs = {
    preimage: leaf1,
    root: "0x" + F.toObject(root).toString(16),
    paths2_root: proofs.map((el) => "0x" + F.toObject(el).toString(16)),
    paths2_root_pos: pos,
  };

  fs.writeFileSync(
    "../src/leaf-existence-input.json",
    JSON.stringify(inputs),
    "utf-8"
  );
};

run();
