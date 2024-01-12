#!/bin/bash
FILE_NAME="transact"
INPUT_PATH="./inputs/transact-input.json"
BUILD_PATH="../build/${FILE_NAME}"
CPP_PATH="${BUILD_PATH}/${FILE_NAME}_cpp"
CPP_FILE_PATH="${CPP_PATH}/${FILE_NAME}"
JS_PATH="${BUILD_PATH}/${FILE_NAME}_js"
JS_FILE_PATH="${JS_PATH}/generate_witness.js"
WASM_FILE_PATH="${JS_PATH}/${FILE_NAME}.wasm"
# cd $CPP_PATH
# make
# cd -
# COMMAND="${CPP_FILE_PATH} ${INPUT_PATH} ${BUILD_PATH}/witness.wtns"
COMMAND="node ${JS_FILE_PATH} ${WASM_FILE_PATH} ${INPUT_PATH} ${BUILD_PATH}/witness.wtns"
# echo $COMMAND
eval "$COMMAND";

# Compute Proof
ZKEY_PATH="../build/zkey"
WTNS_PATH="${BUILD_PATH}/witness.wtns"
snarkjs groth16 prove "${ZKEY_PATH}/${FILE_NAME}_final.zkey" $WTNS_PATH "${ZKEY_PATH}/${FILE_NAME}-proof.json" "${ZKEY_PATH}/${FILE_NAME}-public.json"
snarkjs groth16 verify "${ZKEY_PATH}/${FILE_NAME}_verification-key.json" "${ZKEY_PATH}/${FILE_NAME}-public.json" "${ZKEY_PATH}/${FILE_NAME}-proof.json"
snarkjs zkey export soliditycalldata "${ZKEY_PATH}/${FILE_NAME}-public.json" "${ZKEY_PATH}/${FILE_NAME}-proof.json"
