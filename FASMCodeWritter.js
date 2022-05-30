class FASMCodeWritter {
    constructor() {
        this.code = "";
        this.countOperation = 0;
    }
    mov(op1, op2) {
        this.code += `mov ${op1}, ${op2}` + "\n";
        this.countOperation++;
    }
    add(op1, op2) {
        this.code += `add ${op1}, ${op2}` + "\n";
        this.countOperation++;
    }
    swap(op1, op2) {
        this.code += `xchg ${op1}, ${op2}` + "\n";
        this.countOperation++;
    }
    xchg(op1, op2) {
        this.swap(op1, op2);
    }
    sub(op1, op2) {
        this.code += `sub ${op1}, ${op2}` + "\n";
        this.countOperation++;
    }
    idiv(op) {
        this.code += `cwd` + "\n";
        this.code += `idiv ${op}` + "\n";
        this.countOperation += 2;
    }
    imul(op) {
        this.code += `imul ${op}` + "\n";
        this.countOperation++;
    }
    xor(op1, op2) {
        this.code += `xor ${op1}, ${op2}` + "\n";
        this.countOperation++;
    }
}
