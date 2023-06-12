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

  const leaf1 = mimcjs.multiHash([1, 2, 3], 2);
  const leaf2 = mimcjs.multiHash([4, 5, 6], 2);
  const leaf3 = mimcjs.multiHash([7, 8, 9], 2);
  const leaf4 = mimcjs.multiHash([9, 8, 7], 2);
  const leafArray = [leaf1, leaf2, leaf3, leaf4];

  // console.log("leafArray: ", leafArray);
  const tree = mimcMerkle.treeFromLeafArray(leafArray);
  // console.log("tree: ", tree);
  const root = tree[0][0];
  const leaf1Proof = mimcMerkle.getProof(0, tree, leafArray);
  // console.log("leaf1Proof: ", leaf1Proof);
  const leaf1Pos = [1, 1];

  assert(mimcMerkle.verifyProof(leaf1, 0, leaf1Proof, root));

  const inputs = {
    preimage: [1, 2, 3],
    root: "0x" + F.toObject(root).toString(16),
    paths2_root: [
      "0x" + F.toObject(leaf1Proof[0]).toString(16),
      "0x" + F.toObject(leaf1Proof[1]).toString(16),
    ],
    paths2_root_pos: leaf1Pos,
  };

  fs.writeFileSync("./input.json", JSON.stringify(inputs), "utf-8");
};

run();
