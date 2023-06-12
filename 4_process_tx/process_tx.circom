include "./leaf_existence.circom";
include "./verify_eddsamimc.circom";
include "./get_merkle_root.circom";
include "../node_modules/circomlib/circuits/mimc.circom";

template ProcessTx(k, sb, rb) {
    // k is depth of accounts tree
    // sb is the number of tokenId's sender
    // rb is the number of tokenId's receiver 

    // accounts tree info
    signal input accounts_root;
    signal input intermediate_root;

    // transactions info
    signal input sender_pubkey[2];
    signal input sender_balance[sb][3];
    signal input receiver_pubkey[2];
    signal input receiver_balance[rb][3];

    signal input asset_address;
    signal input token_id;
    signal input quantity;

    // 1: token_id match , 0: don't
    signal input is_tokenid_sender[sb];
    signal input is_tokenid_receiver[rb];

    signal input signature_R8x;
    signal input signature_R8y;
    signal input signature_S;
    signal input sender_proof[k];
    signal input sender_proof_pos[k];
    signal input receiver_proof[k];
    signal input receiver_proof_pos[k];

    // output
    signal output new_accounts_root;

    // hash balance sender
    component hashBalanceSender = MultiMiMC7(sb, 91);
    hashBalanceSender.k <== sb;
    component hashTokenSender[sb];
    for(var i = 0; i < sb; i++) {
        hashTokenSender[i] = MultiMiMC7(3, 91);
        hashTokenSender[i].k <== 3;
        hashTokenSender[i].in[0] <== sender_balance[i][0];
        hashTokenSender[i].in[1] <== sender_balance[i][1];
        hashTokenSender[i].in[2] <== sender_balance[i][2];
        hashBalanceSender.in[i] <== hashTokenSender[i].out;
    }

    // verify sender account exists in accounts_root
    component senderExistence = LeafExistence(k, 3);
    senderExistence.preimage[0] <== sender_pubkey[0];
    senderExistence.preimage[1] <== sender_pubkey[1];
    senderExistence.preimage[2] <== hashBalanceSender.out;
    senderExistence.root <== accounts_root;
    for (var i = 0; i < k; i++){
        senderExistence.paths2_root_pos[i] <== sender_proof_pos[i];
        senderExistence.paths2_root[i] <== sender_proof[i];
    }

    // check that transaction was signed by sender
    component signatureCheck = VerifyEdDSAMiMC(7);
    signatureCheck.from_x <== sender_pubkey[0];
    signatureCheck.from_y <== sender_pubkey[1];
    signatureCheck.R8x <== signature_R8x;
    signatureCheck.R8y <== signature_R8y;
    signatureCheck.S <== signature_S;
    signatureCheck.preimage[0] <== sender_pubkey[0];
    signatureCheck.preimage[1] <== sender_pubkey[1];
    signatureCheck.preimage[2] <== receiver_pubkey[0];
    signatureCheck.preimage[3] <== receiver_pubkey[1];
    signatureCheck.preimage[4] <== asset_address;
    signatureCheck.preimage[5] <== token_id;
    signatureCheck.preimage[6] <== quantity;

    // debit sender account and hash new balance sender
    component hashNewBalanceSender = MultiMiMC7(sb, 91);
    hashNewBalanceSender.k <== sb;
    component hashTokenNewSender[sb];
    for(var i = 0; i < sb; i++) {
        hashTokenNewSender[i] = MultiMiMC7(3, 91);
        hashTokenNewSender[i].k <== 3;
        hashTokenNewSender[i].in[0] <== sender_balance[i][0];
        hashTokenNewSender[i].in[1] <== sender_balance[i][1];
        assert(sender_balance[i][2] >= is_tokenid_sender[i] * quantity);
        hashTokenNewSender[i].in[2] <== sender_balance[i][2] - is_tokenid_sender[i] * quantity;
        hashNewBalanceSender.in[i] <== hashTokenNewSender[i].out;
    }

    // hash new sender leaf
    component newSenderLeaf = MultiMiMC7(3, 91);
    newSenderLeaf.in[0] <== sender_pubkey[0];
    newSenderLeaf.in[1] <== sender_pubkey[1];
    newSenderLeaf.in[2] <== hashNewBalanceSender.out;
    newSenderLeaf.k <== k;

    // update accounts_root
    component computed_intermediate_root = GetMerkleRoot(k);
    computed_intermediate_root.leaf <== newSenderLeaf.out;
    for (var i = 0; i < k; i++){
        computed_intermediate_root.paths2_root_pos[i] <== sender_proof_pos[i];
        computed_intermediate_root.paths2_root[i] <== sender_proof[i];
    }

    // check that computed_intermediate_root.out === intermediate_root
    computed_intermediate_root.out === intermediate_root;

    // hash receiver balance
    component hashBalanceReceiver = MultiMiMC7(rb, 91);
    hashBalanceReceiver.k <== rb;
    component hashTokenReceiver[rb];
    for(var i = 0; i < rb; i++) {
        hashTokenReceiver[i] = MultiMiMC7(3, 91);
        hashTokenReceiver[i].k <== 3;
        hashTokenReceiver[i].in[0] <== receiver_balance[i][0];
        hashTokenReceiver[i].in[1] <== receiver_balance[i][1];
        hashTokenReceiver[i].in[2] <== receiver_balance[i][2];
        hashBalanceReceiver.in[i] <== hashTokenReceiver[i].out;
    }

    // verify receiver account exists in intermediate_root
    component receiverExistence = LeafExistence(k, 3);
    receiverExistence.preimage[0] <== receiver_pubkey[0];
    receiverExistence.preimage[1] <== receiver_pubkey[1];
    receiverExistence.preimage[2] <== hashBalanceReceiver.out;
    receiverExistence.root <== intermediate_root;
    for (var i = 0; i < k; i++){
        receiverExistence.paths2_root_pos[i] <== receiver_proof_pos[i];
        receiverExistence.paths2_root[i] <== receiver_proof[i];
    }

    // credit receiver account hash new balance receiver
    component hashNewBalanceReceiver = MultiMiMC7(rb, 91);
    hashNewBalanceReceiver.k <== rb;
    component hashTokenNewReceiver[rb];
    for(var i = 0; i < rb; i++) {
        hashTokenNewReceiver[i] = MultiMiMC7(3, 91);
        hashTokenNewReceiver[i].k <== 3;
        hashTokenNewReceiver[i].in[0] <== receiver_balance[i][0];
        hashTokenNewReceiver[i].in[1] <== receiver_balance[i][1];
        hashTokenNewReceiver[i].in[2] <== receiver_balance[i][2] + is_tokenid_receiver[i] * quantity;
        hashNewBalanceReceiver.in[i] <== hashTokenNewReceiver[i].out;
    }

    // hash new receiver leaf
    component newReceiverLeaf = MultiMiMC7(3, 91);
    newReceiverLeaf.in[0] <== receiver_pubkey[0];
    newReceiverLeaf.in[1] <== receiver_pubkey[1];
    newReceiverLeaf.in[2] <== hashNewBalanceReceiver.out;
    newReceiverLeaf.k <== k;

    // update accounts_root
    component computed_final_root = GetMerkleRoot(k);
    computed_final_root.leaf <== newReceiverLeaf.out;
    for (var i = 0; i < k; i++){
        computed_final_root.paths2_root_pos[i] <== receiver_proof_pos[i];
        computed_final_root.paths2_root[i] <== receiver_proof[i];
    }

    // output final accounts_root
    new_accounts_root <== computed_final_root.out;
}

component main {public [accounts_root]} = ProcessTx(3, 6, 6);