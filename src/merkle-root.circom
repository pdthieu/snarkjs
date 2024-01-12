pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

/*
Balance {
  listingId, 2 bytes = 16 bits
  address, 20 bytes = 160 bits
  tokenId, 32 bytes = 256 bits
  amount   32 bytes = 256 bits
}
*/

template VerifyMerkleRoot(k) {
  // k is depth of tree

  signal input balances[2**k][4];
  signal input root;
  var i, j;

  component balances_hashed[2**(k+1)-1];
  for (i = 2**k - 1; i < 2**(k+1)-1; i++) {
    balances_hashed[i] = Poseidon(4);
    for (j = 0; j < 4; j++) {
      balances_hashed[i].inputs[j] <== balances[i - (2**k-1)][j];
    }
  }

  for (i = 2**k - 2; i >= 0; i--) {
    balances_hashed[i] = Poseidon(2);
    balances_hashed[i].inputs[0] <== balances_hashed[i*2+1].out;
    balances_hashed[i].inputs[1] <== balances_hashed[i*2+2].out;
  }
  
  root === balances_hashed[0].out;
}

component main {public [root]} = VerifyMerkleRoot(15);