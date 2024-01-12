pragma circom 2.0.0;

include "./merkle-root.circom";
include "./operation-hash.circom";

template Transact(n, m, k) {
  // 
  signal input seperator;
  signal input txs[n][m*2 + 4];
  signal input operation_hash;
  //
  signal input balances[2**k][4];
  signal input root;
  //
  var i, j;

  // verify operation hash
  component verifyOperationHash = VerifyOperationHash(n, m);
  verifyOperationHash.seperator <== seperator;
  for(i = 0; i < n; i++) {
    for(j = 0; j < m*2 + 4; j++) {
      verifyOperationHash.txs[i][j] <== txs[i][j];
    }
  }
  verifyOperationHash.operation_hash <== operation_hash;

  // verify balances
  component verifyMerkleRoot = VerifyMerkleRoot(k);
  verifyMerkleRoot.root <== root;
  for(i = 0; i < 2**k; i++) {
    var s = 0;
    for(j = 0; j < n; j++) {
      // check tokenId
      for(var r = 3; r < 3 + m; r++) {
        s += balances[i][1] == txs[j][0] && balances[i][0] == txs[j][1] && balances[i][2] == txs[j][r] ? txs[j][r+m] : 0;
      }
    }
    verifyMerkleRoot.balances[i][0] <== balances[i][0];
    verifyMerkleRoot.balances[i][1] <== balances[i][1];
    verifyMerkleRoot.balances[i][2] <== balances[i][2];
    verifyMerkleRoot.balances[i][3] <-- balances[i][3] + s;
  }
}

component main {public[seperator, operation_hash, root]} = Transact(500, 19, 20);