const fs = require("fs");
const { buildMimc7 } = require("circomlibjs");
const { buildBabyjub } = require("circomlibjs");
const { buildMiMCMerkle } = require("./MiMCMerkle");
const bigInt = require("./bigInt");

const chai = require("chai");
const assert = chai.assert;

const run = async () => {
  const babyJub = await buildBabyjub();
  const F = babyJub.F;
  const mimcjs = await buildMimc7();
  const mimcMerkle = await buildMiMCMerkle();
  const k = 20;

  const leaf1 = mimcjs.multiHash([1, 2, 3], k);
  const leaf2 = mimcjs.multiHash([4, 5, 6], k);
  const leaf3 = mimcjs.multiHash([7, 8, 9], k);
  const leaf4 = mimcjs.multiHash([9, 8, 7], k);
  // const leafArray = [leaf1, leaf2, leaf3, leaf4];

  // 2^k elements
  const leafArray = [
    leaf1,
    leaf2,
    leaf3,
    Array.from(Array(2 ** k - 3).keys()).map((_el) => leaf4),
  ].flat();
  console.log(leafArray.length);

  // console.log("leafArray: ", leafArray);
  const tree = mimcMerkle.treeFromLeafArray(leafArray);
  let root = tree[0];
  while (Array.isArray(root)) {
    root = root[0];
  }
  const leaf1Proof = mimcMerkle.getProof(0, tree, leafArray);
  console.log("leaf1Proof: ", leaf1Proof);
  // const leaf1Pos = [1, 1];
  const leaf1Pos = mimcMerkle.generateMerklePosArray(k)[0].map((el) => 1 - el);
  console.log(leaf1Pos);

  assert(mimcMerkle.verifyProof(leaf1, 0, leaf1Proof, root));

  const inputs = {
    preimage: [1, 2, 3],
    root: "0x" + F.toObject(root).toString(16),
    paths2_root: leaf1Proof.map((el) => "0x" + F.toObject(el).toString(16)),
    paths2_root_pos: leaf1Pos,
  };

  fs.writeFileSync("./input.json", JSON.stringify(inputs), "utf-8");
};

run();
