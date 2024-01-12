pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

/*
struct Deposit {
  u8[20] sender;
  u8[2] listingId;
  u8 arrayLength;
  u8[MAX_LEN][32] tokenIds;
  u8[MAX_LEN][32] amounts;
  u8[32] requestId;
}
*/


template VerifyOperationHash(n, m) {
  // n is length of txs
  // m is max length of batch

  signal input seperator;
  signal input txs[n][m*2 + 4];
  signal input operation_hash;
  var i, j;

  component txs_hashed[n];
  component hashed_tokenId[n][3];
  component hashed_amount[n][3];
  for (i = 0; i < n; i++) {
    // hashed tokenId: 19 = ((7) + 6) + 6)
    hashed_tokenId[i][0] = Poseidon(7);
    for(j = 0; j < 7; j++) {
      hashed_tokenId[i][0].inputs[j] <== txs[i][3+j];
    }
    hashed_tokenId[i][1] = Poseidon(7);
    hashed_tokenId[i][1].inputs[0] <== hashed_tokenId[i][0].out;
    for(j = 1; j < 7; j++) {
      hashed_tokenId[i][1].inputs[j] <== txs[i][9+j];
    }
    hashed_tokenId[i][2] = Poseidon(7);
    hashed_tokenId[i][2].inputs[0] <== hashed_tokenId[i][1].out;
    for(j = 1; j < 7; j++) {
      hashed_tokenId[i][2].inputs[j] <== txs[i][15+j];
    }

    // hashed amounts: 19 = ((7) + 6) + 6)
    hashed_amount[i][0] = Poseidon(7);
    for(j = 0; j < 7; j++) {
      hashed_amount[i][0].inputs[j] <== txs[i][22+j];
    }
    hashed_amount[i][1] = Poseidon(7);
    hashed_amount[i][1].inputs[0] <== hashed_amount[i][0].out;
    for(j = 1; j < 7; j++) {
      hashed_amount[i][1].inputs[j] <== txs[i][28+j];
    }
    hashed_amount[i][2] = Poseidon(7);
    hashed_amount[i][2].inputs[0] <== hashed_amount[i][1].out;
    for(j = 1; j < 7; j++) {
      hashed_amount[i][2].inputs[j] <== txs[i][34+j];
    }

    txs_hashed[i] = Poseidon(4);
    txs_hashed[i].inputs[0] <== txs[i][0];
    txs_hashed[i].inputs[1] <== txs[i][1];
    txs_hashed[i].inputs[2] <== hashed_tokenId[i][2].out;
    txs_hashed[i].inputs[3] <== hashed_amount[i][2].out;
  }

  component computed_operation_hash[n];
  computed_operation_hash[0] = Poseidon(2);
  computed_operation_hash[0].inputs[0] <== seperator;
  computed_operation_hash[0].inputs[1] <== txs_hashed[0].out;
  for(i = 1; i < n; i++) {
    computed_operation_hash[i] = Poseidon(2);
    computed_operation_hash[i].inputs[0] <== computed_operation_hash[i-1].out;
    computed_operation_hash[i].inputs[1] <== txs_hashed[i].out;
  }
  log(operation_hash);
  log(computed_operation_hash[n-1].out);
  operation_hash === computed_operation_hash[n-1].out;
}

// component main {public [seperator, operation_hash]} = VerifyOperationHash(5, 19);