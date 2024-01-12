// const mimcjs = require("../node_modules/circomlibjs/src/mimc7.js");
const { buildPoseidonOpt } = require("circomlibjs");
const { buildBabyjub } = require("circomlibjs");
const bigInt = require("./bigInt");

module.exports = {
  buildPoseidonMerkle: async function () {
    const babyJub = await buildBabyjub();
    const F = babyJub.F;
    const poseidonJs = await buildPoseidonOpt();
    return new PoseidonMerkle(poseidonJs, F);
  },
};

class PoseidonMerkle {
  constructor(poseidonJs, F) {
    this.poseidonJs = poseidonJs;
    this.F = F;
  }

  // cache empty tree values
  getZeroCache(zeroLeafHash, depth) {
    var zeroCache = new Array(depth);
    zeroCache[0] = zeroLeafHash;
    for (var i = 1; i < depth; i++) {
      zeroCache[i] = this.poseidonJs([zeroCache[i - 1], zeroCache[i - 1]]);
    }
    return zeroCache;
  }

  getProof(leafIdx, tree, leaves) {
    const depth = tree.length;
    const proofIdx = this.proofIdx(leafIdx, depth);
    var proof = new Array(depth);
    proof[0] = leaves[proofIdx[0]];
    for (var i = 1; i < depth; i++) {
      proof[i] = tree[depth - i][proofIdx[i]];
    }
    return proof;
  }

  getProofEmpty(height, zeroCache) {
    var depth = zeroCache.length;
    if (height < depth) {
      return zeroCache.slice(height, depth + 1);
    } else {
      return [];
    }
  }

  verifyProof(leaf, idx, proof, root) {
    var computed_root = this.rootFromLeafAndPath(leaf, idx, proof);

    return this.toBigInt(root) == this.toBigInt(computed_root);
  }

  rootFromLeafAndPath(leaf, idx, merkle_path) {
    if (merkle_path.length > 0) {
      var depth = merkle_path.length;
      var merkle_path_pos = this.idxToBinaryPos(idx, depth);
      var root = new Array(depth);

      var left = this.toBigInt(merkle_path_pos[0] ? merkle_path[0] : leaf);
      var right = this.toBigInt(merkle_path_pos[0] ? leaf : merkle_path[0]);
      root[0] = this.poseidonJs([left, right]);
      for (var i = 1; i < depth; i++) {
        left = this.toBigInt(
          merkle_path_pos[i] ? merkle_path[i] : root[i - 1]
        );
        right = this.toBigInt(
          merkle_path_pos[i] ? root[i - 1] : merkle_path[i]
        );
        root[i] = this.poseidonJs([left, right]);
      }
      return root[depth - 1];
    } else {
      return leaf;
    }
  }

  // fill a leaf array with zero leaves until it is a power of 2
  padLeafArray(leafArray, zeroLeaf, fillerLength) {
    if (Array.isArray(leafArray)) {
      var arrayClone = leafArray.slice(0);
      const nearestPowerOfTwo = Math.ceil(this.getBase2Log(leafArray.length));
      const diff = fillerLength || 2 ** nearestPowerOfTwo - leafArray.length;
      for (var i = 0; i < diff; i++) {
        arrayClone.push(zeroLeaf);
      }
      return arrayClone;
    } else {
      console.log("please enter pubKeys as an array");
    }
  }

  // fill a leaf hash array with zero leaf hashes until it is a power of 2
  padLeafHashArray(leafHashArray, zeroLeafHash, fillerLength) {
    if (Array.isArray(leafHashArray)) {
      var arrayClone = leafHashArray.slice(0);
      const nearestPowerOfTwo = Math.ceil(getBase2Log(leafHashArray.length));
      const diff =
        fillerLength || 2 ** nearestPowerOfTwo - leafHashArray.length;
      for (var i = 0; i < diff; i++) {
        arrayClone.push(zeroLeafHash);
      }
      return arrayClone;
    } else {
      console.log("please enter pubKeys as an array");
    }
  }

  treeFromLeafArray(leafArray) {
    var depth = this.getBase2Log(leafArray.length);
    var tree = Array(depth);
    tree[depth - 1] = this.pairwiseHash(leafArray);

    for (var j = depth - 2; j >= 0; j--) {
      tree[j] = this.pairwiseHash(tree[j + 1]);
    }

    return tree;
  }

  rootFromLeafArray(leafArray) {
    return this.treeFromLeafArray(leafArray)[0][0];
  }

  pairwiseHash(array) {
    if (array.length % 2 == 0) {
      var arrayHash = [];
      for (var i = 0; i < array.length; i = i + 2) {
        arrayHash.push(this.poseidonJs([array[i], array[i + 1]]));
      }
      return arrayHash;
    } else {
      console.log("array must have even number of elements");
    }
  }

  generateMerklePosArray(depth) {
    var merklePosArray = [];
    for (var i = 0; i < 2 ** depth; i++) {
      var binPos = this.idxToBinaryPos(i, depth);
      merklePosArray.push(binPos);
    }
    return merklePosArray;
  }

  generateMerkleProofArray(txTree, txLeafHashes) {
    var txProofs = new Array(txLeafHashes.length);
    for (var jj = 0; jj < txLeafHashes.length; jj++) {
      txProofs[jj] = this.getProof(jj, txTree, txLeafHashes);
    }
    return txProofs;
  }

  ///////////////////////////////////////////////////////////////////////
  // HELPER FUNCTIONS
  ///////////////////////////////////////////////////////////////////////

  getBase2Log(y) {
    return Math.log(y) / Math.log(2);
  }

  binaryPosToIdx(binaryPos) {
    var idx = 0;
    for (var i = 0; i < binaryPos.length; i++) {
      idx = idx + binaryPos[i] * 2 ** i;
    }
    return idx;
  }

  idxToBinaryPos(idx, binLength) {
    var binString = idx.toString(2);
    var binPos = Array(binLength).fill(0);
    for (var j = 0; j < binString.length; j++) {
      binPos[j] = Number(binString.charAt(binString.length - j - 1));
    }
    return binPos;
  }

  proofIdx(leafIdx, treeDepth) {
    var proofIdxArray = new Array(treeDepth);
    var proofPos = this.idxToBinaryPos(leafIdx, treeDepth);

    if (leafIdx % 2 == 0) {
      proofIdxArray[0] = leafIdx + 1;
    } else {
      proofIdxArray[0] = leafIdx - 1;
    }

    for (var i = 1; i < treeDepth; i++) {
      if (proofPos[i] == 1) {
        proofIdxArray[i] = Math.floor(proofIdxArray[i - 1] / 2) - 1;
      } else {
        proofIdxArray[i] = Math.floor(proofIdxArray[i - 1] / 2) + 1;
      }
    }

    return proofIdxArray;
  }

  toBigInt(value) {
    return bigInt(this.F.toObject(value).toString());
  }
}
