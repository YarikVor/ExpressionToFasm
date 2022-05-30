class FASMCodeWritterEditor {
    constructor(fc) {
        this.fc = fc;
    }
    add(res, op1, op2) {
        if (res.top === op1.top && res.top === op2.top) {
            this.fc.add(res, res);
        }
        else if (op1.top.isEqual(op2.top)) {
            this.fc.mov(res, op1);
            this.fc.add(res, res);
        }
        else if (res.top !== op1.top && res.top !== op2.top) {
            this.fc.mov(res, op1);
            this.fc.add(res, op2);
        }
        else {
            this.fc.add(res.top === op1.top ? op1 : op2, res.top !== op1.top ? op1 : op2);
        }
    }
    sub(res, op1, op2) {
        if (res.top === op1.top && res.top === op2.top || op1.top.isEqual(op2.top)) {
            this.fc.xor(res, res);
        }
        else if (res.top === op1.top) {
            this.fc.sub(res, op2);
        }
        else if (res.top !== op1.top && res.top !== op2.top) {
            this.fc.mov(res, op1);
            this.fc.sub(res, op2);
        }
        else {
            this.fc.sub(res.top === op1.top ? op1 : op2, res.top !== op1.top ? op1 : op2);
        }
    }
    mov(op1, op2) {
        if (op1.top !== op2.top) {
            this.fc.mov(op1, op2);
            op1.top = op2.top;
        }
    }
    idiv(op2) {
        this.fc.idiv(op2);
    }
    swap(op1, op2) {
        if (op1.top !== op2.top) {
            this.fc.swap(op1, op2);
            [op1.top, op2.top] = [op2.top, op1.top];
        }
    }
    imul(op) {
        this.fc.imul(op);
    }
}
