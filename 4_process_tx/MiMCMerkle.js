// const mimcjs = require("../node_modules/circomlibjs/src/mimc7.js");
const { buildMimc7 } = require("circomlibjs");
const { buildBabyjub } = require("circomlibjs");
const bigInt = require("./bigInt");

module.exports = {
  buildMiMCMerkle: async function (depth) {
    const mimcjs = await buildMimc7();
    const babyJub = await buildBabyjub();
    const F = babyJub.F;
    return new MiMCMerkle(mimcjs, F, depth);
  },
};

class MiMCMerkle {
  constructor(mimcjs, F, depth) {
    this.mimcjs = mimcjs;
    this.F = F;
    this.depth = depth;
  }

  // cache empty tree values
  getZeroCache(zeroLeafHash) {
    var zeroCache = new Array(this.depth);
    zeroCache[0] = zeroLeafHash;
    for (var i = 1; i < this.depth; i++) {
      zeroCache[i] = this.mimcjs.multiHash(
        [zeroCache[i - 1], zeroCache[i - 1]],
        this.depth
      );
    }
    return zeroCache;
  }

  getProof(leafIdx, tree, leaves) {
    const proofIdx = this.proofIdx(leafIdx, this.depth);
    var proof = new Array(this.depth);
    proof[0] = leaves[proofIdx[0]];
    for (var i = 1; i < this.depth; i++) {
      proof[i] = tree[this.depth - i][proofIdx[i]];
    }
    return proof;
  }

  getProofEmpty(height, zeroCache) {
    if (height < this.depth) {
      return zeroCache.slice(height, this.depth + 1);
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
      var merkle_path_pos = this.idxToBinaryPos(idx, this.depth);
      var root = new Array(this.depth);

      var left =
        this.toBigInt(leaf) -
        bigInt(merkle_path_pos[0]) *
          (this.toBigInt(leaf) - this.toBigInt(merkle_path[0]));
      var right =
        this.toBigInt(merkle_path[0]) -
        bigInt(merkle_path_pos[0]) *
          (this.toBigInt(merkle_path[0]) - this.toBigInt(leaf));

      root[0] = this.mimcjs.multiHash([left, right], this.depth);

      for (var i = 1; i < this.depth; i++) {
        left =
          this.toBigInt(root[i - 1]) -
          bigInt(merkle_path_pos[i]) *
            (this.toBigInt(root[i - 1]) - this.toBigInt(merkle_path[i]));
        right =
          this.toBigInt(merkle_path[i]) -
          bigInt(merkle_path_pos[i]) *
            (this.toBigInt(merkle_path[i]) - this.toBigInt(root[i - 1]));

        root[i] = this.mimcjs.multiHash([left, right], this.depth);
      }
      return root[this.depth - 1];
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
    var tree = Array(this.depth);
    tree[this.depth - 1] = this.pairwiseHash(leafArray);

    for (var j = this.depth - 2; j >= 0; j--) {
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
        arrayHash.push(this.mimcjs.multiHash([array[i], array[i + 1]], this.depth));
      }
      return arrayHash;
    } else {
      console.log("array must have even number of elements");
    }
  }

  generateMerklePosArray() {
    var merklePosArray = [];
    for (var i = 0; i < 2 ** this.depth; i++) {
      var binPos = this.idxToBinaryPos(i, this.depth);
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
