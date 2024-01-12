#!/bin/bash
PTAU_NAME="pot16"
mkdir -p ../build/ptau/
cd ../build/ptau/
snarkjs powersoftau new bn128 16 "${PTAU_NAME}_0.ptau" -v
snarkjs powersoftau contribute "${PTAU_NAME}_0.ptau" "${PTAU_NAME}_1.ptau" --name="First contribution" -v
snarkjs powersoftau contribute "${PTAU_NAME}_1.ptau" "${PTAU_NAME}_2.ptau" --name="Second contribution" -v -e="some random text"
snarkjs powersoftau export challenge "${PTAU_NAME}_2.ptau" challenge_0003
snarkjs powersoftau challenge contribute bn128 challenge_0003 response_0003 -e="some random text"
snarkjs powersoftau import response "${PTAU_NAME}_2.ptau" response_0003 "${PTAU_NAME}_3.ptau" -n="Third contribution name"
snarkjs powersoftau verify "${PTAU_NAME}_3.ptau"
snarkjs powersoftau beacon "${PTAU_NAME}_3.ptau" "${PTAU_NAME}_beacon.ptau"  0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"
snarkjs powersoftau prepare phase2 "${PTAU_NAME}_beacon.ptau" "${PTAU_NAME}_final.ptau" -v
rm "${PTAU_NAME}_0.ptau" "${PTAU_NAME}_1.ptau" "${PTAU_NAME}_2.ptau" "${PTAU_NAME}_3.ptau" "${PTAU_NAME}_beacon.ptau" challenge_0003 response_0003
cd -