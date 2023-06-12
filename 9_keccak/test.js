const keccak256 = require("keccak256");
const ethers = require("ethers");

const sender =
  "0x000000000000aw000000000000000000000000000000000000000005762109a3";

const receiver =
  "0x00df00000000000000000000qe000000000000000000000000000005762109a3";

const hash = keccak256(web3.eth.abi.encode(sender, receiver));

console.log(hash);