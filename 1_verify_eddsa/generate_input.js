const fs = require("fs");
const { buildEddsa } = require("circomlibjs");
const { buildMimc7 } = require("circomlibjs");
const { buildBabyjub } = require("circomlibjs");

const chai = require("chai");
const assert = chai.assert;

const run = async () => {
  const babyJub = await buildBabyjub();
  const F = babyJub.F;
  const eddsa = await buildEddsa();
  const mimcjs = await buildMimc7();

  const preimage = [123, 456, 789];
  const M = mimcjs.multiHash(preimage, preimage.length);
  const prvKey = Buffer.from("1".toString().padStart(64, "0"), "hex");
  const pubKey = eddsa.prv2pub(prvKey);
  const signature = eddsa.signMiMC(prvKey, M);

  assert(eddsa.verifyMiMC(M, signature, pubKey));

  const inputs = {
    from_x: "0x" + F.toObject(pubKey[0]).toString(16),
    from_y: "0x" + F.toObject(pubKey[1]).toString(16),
    R8x: "0x" + F.toObject(signature.R8[0]).toString(16),
    R8y: "0x" + F.toObject(signature.R8[1]).toString(16),
    S: signature["S"].toString(),
    preimage: preimage,
  };

  fs.writeFileSync("./input.json", JSON.stringify(inputs), "utf-8");
};

run();
