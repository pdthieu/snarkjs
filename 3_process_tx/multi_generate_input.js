const fs = require("fs");
const { buildEddsa } = require("circomlibjs");
const { buildMimc7 } = require("circomlibjs");
const { buildBabyjub } = require("circomlibjs");
const { buildMiMCMerkle } = require("./MiMCMerkle");
const { assert } = require("console");

const run = async () => {
  const babyJub = await buildBabyjub();
  const F = babyJub.F;
  const eddsa = await buildEddsa();
  const mimcjs = await buildMimc7();

  function bytesToHex(byteArray) {
    return "0x" + F.toObject(byteArray).toString(16);
  }

  const prvKey = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const depth = Math.log(prvKey.length) / Math.log(2);

  // build mimcMerkle
  const mimcMerkle = await buildMiMCMerkle(depth);

  const accountsPrvKey = [];
  prvKey.forEach((element) => {
    accountsPrvKey.push(
      Buffer.from(element.toString().padStart(64, "0"), "hex")
    );
  });

  const accountsPubKey = [];
  accountsPrvKey.forEach((element) => {
    accountsPubKey.push(eddsa.prv2pub(element));
  });

  const accounts = [];
  for (var i = 0; i < accountsPubKey.length; i++) {
    accounts.push({ pubkey: accountsPubKey[i], balance: (i + 1) * 100 });
  }

  const accountsHash = [];
  accounts.forEach((element) => {
    accountsHash.push(
      mimcjs.multiHash(
        [element.pubkey[0], element.pubkey[1], element.balance],
        depth
      )
    );
  });

  const accounts_tree = mimcMerkle.treeFromLeafArray(accountsHash);
  const accounts_root = accounts_tree[0][0];

  // transaction from `senderIdx` to `receiverIdx` with amount `value`
  const senderIdx = 0;
  const receiverIdx = 7;
  const value = 50;
  const tx = {
    from: accounts[senderIdx].pubkey,
    to: accounts[receiverIdx].pubkey,
    amount: value,
  };

  // account of senderIdx sign tx
  const txHash = mimcjs.multiHash(
    [tx.from[0], tx.from[1], tx.to[0], tx.to[1], tx.amount],
    5
  );
  const signature = eddsa.signMiMC(accountsPrvKey[senderIdx], txHash);
  assert(eddsa.verifyMiMC(txHash, signature, accountsPubKey[senderIdx]));

  // update sender account
  const newSender = {
    pubkey: accountsPubKey[senderIdx],
    balance: accounts[senderIdx].balance - value,
  };
  const newSenderHash = mimcjs.multiHash(
    [newSender.pubkey[0], newSender.pubkey[1], newSender.balance],
    depth
  );

  // update intermediate root
  var intermediate_accountsHash = [...accountsHash];
  intermediate_accountsHash[senderIdx] = newSenderHash;
  const intermediate_tree = mimcMerkle.treeFromLeafArray(
    intermediate_accountsHash
  );
  const intermediate_root = intermediate_tree[0][0];

  // update receiver account
  const newReceiver = {
    pubkey: accountsPubKey[receiverIdx],
    balance: accounts[receiverIdx].balance + value,
  };
  const newReceiverHash = mimcjs.multiHash(
    [newReceiver.pubkey[0], newReceiver.pubkey[1], newReceiver.balance],
    depth
  );

  // update final root
  var final_accountsHash = [...intermediate_accountsHash];
  final_accountsHash[receiverIdx] = newReceiverHash;
  const final_root = mimcMerkle.treeFromLeafArray(final_accountsHash)[0][0];

  // get proof for sender
  var senderProof = mimcMerkle.getProof(
    senderIdx,
    accounts_tree,
    accountsHash
  );
  assert(
    mimcMerkle.verifyProof(
      accountsHash[senderIdx],
      senderIdx,
      senderProof,
      accounts_root
    )
  );
  for (var i = 0; i < senderProof.length; i++) {
    senderProof[i] = bytesToHex(senderProof[i]);
  }
  var senderProofPos = mimcMerkle.proofIdx(senderIdx, depth);
  for (var i = 0; i < senderProofPos.length; i++) {
    senderProofPos[i] = senderProofPos[i] % 2;
  }

  // get proof for sender
  var receiverProof = mimcMerkle.getProof(
    receiverIdx,
    intermediate_tree,
    intermediate_accountsHash
  );
  assert(
    mimcMerkle.verifyProof(
      intermediate_accountsHash[receiverIdx],
      receiverIdx,
      receiverProof,
      intermediate_root
    )
  );
  for (var i = 0; i < receiverProof.length; i++) {
    receiverProof[i] = bytesToHex(receiverProof[i]);
  }
  var receiverProofPos = mimcMerkle.proofIdx(receiverIdx, depth);
  for (var i = 0; i < receiverProofPos.length; i++) {
    receiverProofPos[i] = receiverProofPos[i] % 2;
  }

  // console.log("receiver idx: ", receiverIdx);
  // console.log("receiver proof pos: ", receiverProofPos);

  // setting input
  var input_accounts_pubkeys = [];
  var input_accounts_balances = [];
  accounts.forEach((element) => {
    input_accounts_pubkeys.push([
      bytesToHex(element.pubkey[0]),
      bytesToHex(element.pubkey[1]),
    ]);
    input_accounts_balances.push(element.balance);
  });
  const inputs = {
    accounts_root: bytesToHex(accounts_root),
    intermediate_root: bytesToHex(intermediate_root),
    accounts_pubkeys: input_accounts_pubkeys,
    accounts_balances: input_accounts_balances,
    sender_pubkey: input_accounts_pubkeys[senderIdx],
    sender_balance: input_accounts_balances[senderIdx],
    receiver_pubkey: input_accounts_pubkeys[receiverIdx],
    receiver_balance: input_accounts_balances[receiverIdx],
    amount: tx.amount,
    signature_R8x: bytesToHex(signature["R8"][0]),
    signature_R8y: bytesToHex(signature["R8"][1]),
    signature_S: signature["S"].toString(),
    sender_proof: senderProof,
    sender_proof_pos: senderProofPos,
    receiver_proof: receiverProof,
    receiver_proof_pos: receiverProofPos,
  };

  fs.writeFileSync("./input.json", JSON.stringify(inputs), "utf-8");
};

run();
