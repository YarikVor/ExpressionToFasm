class FASMCodeWritter {
    code;
    mov(op1, op2) {
        this.code += `mov ${op1}, ${op2}` + "\n";
    }
    add(op1, op2) {
        this.code += `add ${op1}, ${op2}` + "\n";
    }
    swap(op1, op2) {
        this.code += `xchg ${op1}, ${op2}` + "\n";
    }
    xchg(op1, op2) {
        this.swap(op1, op2);
    }
    sub(op1, op2) {
        this.code += `sub ${op1}, ${op2}` + "\n";
    }
    idiv(op) {
        this.code += `cwd` + "\n";
        this.code += `idiv ${op}` + "\n";
    }
    imul(op) {
        this.code += `imul ${op}` + "\n";
    }
}
