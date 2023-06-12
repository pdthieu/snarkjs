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

  const prvKey = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const depth = Math.floor(Math.log(prvKey.length) / Math.log(2));

  function hashAccount(account) {
    var tokensHash = [];
    for (const [key, value] of Object.entries(account.balance)) {
      value.tokens.forEach((x) => {
        tokensHash.push(
          mimcjs.multiHash([value.address, x.token_id, x.quantity], 3)
        );
      });
    }
    var balanceHash = mimcjs.multiHash(tokensHash, tokensHash.length);
    return mimcjs.multiHash(
      [account.pubkey[0], account.pubkey[1], balanceHash],
      depth
    );
  }

  function hashAccounts(accounts) {
    var accountsHash = [];
    accounts.forEach((element) => {
      var tokensHash = [];
      for (const [key, value] of Object.entries(element.balance)) {
        value.tokens.forEach((x) => {
          tokensHash.push(
            mimcjs.multiHash([value.address, x.token_id, x.quantity], 3)
          );
        });
      }
      var balanceHash = mimcjs.multiHash(tokensHash, tokensHash.length);

      accountsHash.push(
        mimcjs.multiHash(
          [element.pubkey[0], element.pubkey[1], balanceHash],
          depth
        )
      );
    });

    return accountsHash;
  }

  function bytesToHex(byteArray) {
    return "0x" + F.toObject(byteArray).toString(16);
  }

  function deepCopyAccount(account) {
    var copyAccount = {};
    copyAccount.pubkey = account.pubkey;
    var copyBalance = {};
    for (const [key, value] of Object.entries(account.balance)) {
      var copyToken = {};
      copyToken.address = value.address;
      copyToken.tokens = [];
      value.tokens.forEach((element) => {
        var copy = {};
        copy.token_id = element.token_id;
        copy.quantity = element.quantity;
        copyToken.tokens.push({ ...copy });
      });
      copyBalance[key] = { ...copyToken };
    }
    copyAccount.balance = { ...copyBalance };
    return copyAccount;
  }

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

  var accounts = [];
  for (var i = 0; i < accountsPubKey.length; i++) {
    accounts.push({
      pubkey: accountsPubKey[i],
      balance: {
        inu: {
          address: "001",
          tokens: [
            {
              token_id: (i % 2) * 10 + 1,
              quantity: (i + 1) * 10 + 1,
            },
            {
              token_id: (i % 2) * 10 + 2,
              quantity: (i + 1) * 10 + 1,
            },
            {
              token_id: (i % 2) * 10 + 3,
              quantity: (i + 1) * 10 + 1,
            },
          ],
        },
        neko: {
          address: "002",
          tokens: [
            {
              token_id: (i % 2) * 10 + 4,
              quantity: (i + 1) * 10 + 1,
            },
            {
              token_id: (i % 2) * 10 + 5,
              quantity: (i + 1) * 10 + 1,
            },
            {
              token_id: (i % 2) * 10 + 6,
              quantity: (i + 1) * 10 + 1,
            },
          ],
        },
      },
    });
  }

  var accountsHash = hashAccounts(accounts);

  const accounts_tree = mimcMerkle.treeFromLeafArray(accountsHash);
  const accounts_root = accounts_tree[0][0];

  // transaction from `senderIdx` to `receiverIdx` with amount `value`
  const senderIdx = 0;
  const receiverIdx = 6;
  const assetAddress = "001";
  const tokenId = 2;
  const quantity = 4;
  const tx = {
    from: accounts[senderIdx].pubkey,
    to: accounts[receiverIdx].pubkey,
    asset_address: assetAddress,
    token_id: tokenId,
    quantity: quantity,
  };

  // account of senderIdx sign tx
  const txHash = mimcjs.multiHash(
    [
      tx.from[0],
      tx.from[1],
      tx.to[0],
      tx.to[1],
      tx.asset_address,
      tx.token_id,
      tx.quantity,
    ],
    7
  );
  const signature = eddsa.signMiMC(accountsPrvKey[senderIdx], txHash);
  assert(eddsa.verifyMiMC(txHash, signature, accountsPubKey[senderIdx]));

  // update sender account
  var newSender = deepCopyAccount(accounts[senderIdx]);

  for (const [key, value] of Object.entries(newSender.balance)) {
    if (value.address == assetAddress) {
      value.tokens.forEach((element) => {
        if (element.token_id == tokenId) {
          assert(element.quantity >= quantity);
          element.quantity -= quantity;
        }
      });
    }
  }

  // hash new sender
  var newSenderHash = hashAccount(newSender);

  // update intermediate root
  var intermediate_accountsHash = [...accountsHash];
  intermediate_accountsHash[senderIdx] = newSenderHash;
  const intermediate_tree = mimcMerkle.treeFromLeafArray(
    intermediate_accountsHash
  );
  const intermediate_root = intermediate_tree[0][0];

  // update receiver account
  var newReceiver = deepCopyAccount(accounts[receiverIdx]);
  for (const [key, value] of Object.entries(newReceiver.balance)) {
    if (value.address == assetAddress) {
      value.tokens.forEach((element) => {
        if (element.token_id == tokenId) {
          element.quantity += quantity;
        }
      });
    }
  }

  // hash new receiver
  var newReceiverHash = hashAccount(newReceiver);

  // update final root
  var final_accountsHash = [...accountsHash];
  final_accountsHash[senderIdx] = newReceiverHash;
  const final_tree = mimcMerkle.treeFromLeafArray(final_accountsHash);
  const final_root = intermediate_tree[0][0];

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

  // setting input
  var input_accounts_pubkeys = [];
  var input_accounts_balances = [];
  accounts.forEach((element) => {
    input_accounts_pubkeys.push([
      bytesToHex(element.pubkey[0]),
      bytesToHex(element.pubkey[1]),
    ]);
    // input_accounts_balances.push(element.balance);
  });

  var input_receiver_balance = [];
  var input_sender_balance = [];
  var is_tokenid_sender = [];
  var is_tokenid_receiver = [];

  for (var [key, value] of Object.entries(accounts[senderIdx].balance)) {
    value.tokens.forEach((x) => {
      var token = [];
      token.push(value.address);
      token.push(x.token_id);
      token.push(x.quantity);
      input_sender_balance.push(token);
      if (value.address == assetAddress && x.token_id == tokenId) {
        is_tokenid_sender.push(1);
      } else {
        is_tokenid_sender.push(0);
      }
    });
  }

  for (var [key, value] of Object.entries(accounts[receiverIdx].balance)) {
    value.tokens.forEach((x) => {
      var token = [];
      token.push(value.address);
      token.push(x.token_id);
      token.push(x.quantity);
      input_receiver_balance.push(token);
      if (value.address == assetAddress && x.token_id == tokenId) {
        is_tokenid_receiver.push(1);
      } else {
        is_tokenid_receiver.push(0);
      }
    });
  }

  const inputs = {
    accounts_root: bytesToHex(accounts_root),
    intermediate_root: bytesToHex(intermediate_root),
    // accounts_pubkeys: input_accounts_pubkeys,
    // accounts_balances: input_accounts_balances,
    sender_pubkey: input_accounts_pubkeys[senderIdx],
    sender_balance: input_sender_balance,
    receiver_pubkey: input_accounts_pubkeys[receiverIdx],
    receiver_balance: input_receiver_balance,
    asset_address: assetAddress,
    token_id: tokenId,
    quantity: quantity,
    is_tokenid_sender: is_tokenid_sender,
    is_tokenid_receiver: is_tokenid_receiver,
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
