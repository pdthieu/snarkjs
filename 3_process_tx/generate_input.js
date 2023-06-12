const fs = require("fs");
const { buildEddsa } = require("circomlibjs");
const { buildMimc7 } = require("circomlibjs");
const { buildBabyjub } = require("circomlibjs");
const { assert } = require("console");

const run = async () => {

  const babyJub = await buildBabyjub();
  const F = babyJub.F;
  const eddsa = await buildEddsa();
  const mimcjs = await buildMimc7();


  function bytesToHex(byteArray) {
    // console.log(byteArray);
    return "0x" + F.toObject(byteArray).toString(16);
  }

  const alicePrvKey = Buffer.from("1".toString().padStart(64, "0"), "hex");
  const alicePubKey = eddsa.prv2pub(alicePrvKey);
  const bobPrvKey = Buffer.from("2".toString().padStart(64, "0"), "hex");
  const bobPubKey = eddsa.prv2pub(bobPrvKey);

  // accounts
  const Alice = {
    pubkey: alicePubKey,
    balance: 500,
  };
  const aliceHash = mimcjs.multiHash([
    Alice.pubkey[0],
    Alice.pubkey[1],
    Alice.balance,
  ], 1);

  const Bob = {
    pubkey: bobPubKey,
    balance: 0,
  };
  const bobHash = mimcjs.multiHash([Bob.pubkey[0], Bob.pubkey[1], Bob.balance], 1);

  const accounts_root = mimcjs.multiHash([aliceHash, bobHash], 1);

  // transaction
  const tx = {
    from: Alice.pubkey,
    to: Bob.pubkey,
    amount: 500,
  };

  // Alice sign tx
  const txHash = mimcjs.multiHash([
    tx.from[0],
    tx.from[1],
    tx.to[0],
    tx.to[1],
    tx.amount,
  ], 5);
  const signature = eddsa.signMiMC(alicePrvKey, txHash);

  assert(eddsa.verifyMiMC(txHash, signature, alicePubKey));

  // update Alice account
  const newAlice = {
    pubkey: alicePubKey,
    balance: 0,
  };
  const newAliceHash = mimcjs.multiHash([
    newAlice.pubkey[0],
    newAlice.pubkey[1],
    newAlice.balance,
  ], 1);

  // update intermediate root
  const intermediate_root = mimcjs.multiHash([newAliceHash, bobHash], 1);

  // update Bob account
  const newBob = {
    pubkey: bobPubKey,
    balance: 500,
  };
  const newBobHash = mimcjs.multiHash([
    newBob.pubkey[0],
    newBob.pubkey[1],
    newBob.balance,
  ], 1);

  // update final root
  const final_root = mimcjs.multiHash([newAliceHash, newBobHash], 1);

  const inputs = {
    accounts_root: bytesToHex(accounts_root),
    intermediate_root: bytesToHex(intermediate_root),
    accounts_pubkeys: [
      [bytesToHex(Alice.pubkey[0]), bytesToHex(Alice.pubkey[1])],
      [bytesToHex(Bob.pubkey[0]), bytesToHex(Bob.pubkey[1])],
    ],
    accounts_balances: [Alice.balance, Bob.balance],
    sender_pubkey: [bytesToHex(Alice.pubkey[0]), bytesToHex(Alice.pubkey[1])],
    sender_balance: Alice.balance,
    receiver_pubkey: [bytesToHex(Bob.pubkey[0]), bytesToHex(Bob.pubkey[1])],
    receiver_balance: Bob.balance,
    amount: tx.amount,
    signature_R8x: bytesToHex(signature["R8"][0]),
    signature_R8y: bytesToHex(signature["R8"][1]),
    signature_S: signature["S"].toString(),
    sender_proof: [bytesToHex(bobHash)],
    sender_proof_pos: [1],
    receiver_proof: [bytesToHex(newAliceHash)],
    receiver_proof_pos: [0],
  };
  
  fs.writeFileSync("./input.json", JSON.stringify(inputs), "utf-8");
}

run();