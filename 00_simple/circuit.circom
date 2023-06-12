include "../node_modules/circomlib/circuits/mimc.circom";


template HashBalance(l) {
    signal input balance[l][3];
    signal output out;

    component r = MultiMiMC7(l, 91);
    r.k <== l;

    component multiMimc[l];

    for(var i = 0; i < l; i++) {
        multiMimc[i] = MultiMiMC7(3, 91);
        multiMimc[i].k <== 3;
        multiMimc[i].in[0] <== balance[i][0];
        multiMimc[i].in[1] <== balance[i][1];
        multiMimc[i].in[2] <== balance[i][2];
        r.in[i] <== multiMimc[i].out;
    }

    out <== r.out;
}

template A() {
    signal input a;
    signal output out;

    var c = 1;

    assert(c == 1);

    out <== c;
}

template SimpleChecks(k, l, mx) {
    signal input a;
    signal input p[mx[2][0]];
    signal output out;

    component B = A();
    B.a <== a;

    out <== p[1];
}

// { "a": [2, 3], "b": 4, "c": 6, "d": 24 }

// export the template
component main = SimpleChecks(2, 4, [[2,3], [6,7]]);