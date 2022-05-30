class FASMCodeWritter{
    public code: string = "";

    public countOperation: number = 0;

    public mov(op1: Object, op2: Object): void{
        this.code += `mov ${op1}, ${op2}` + "\n";
        this.countOperation++;
    }

    public add(op1: Object, op2: Object): void{
        this.code += `add ${op1}, ${op2}` + "\n";
        this.countOperation++;
    }

    public swap(op1: Object, op2: Object): void{
        this.code += `xchg ${op1}, ${op2}` + "\n";
        this.countOperation++;
    }

    public xchg(op1: Object, op2: Object): void {
        this.swap(op1, op2);
    }

    public sub(op1: Object, op2: Object): void{
        this.code += `sub ${op1}, ${op2}` + "\n";
        this.countOperation++;
    }

    public idiv(op: Object): void {
        this.code += `cwd` + "\n";
        this.code += `idiv ${op}` + "\n";
        this.countOperation += 2;
    }

    public imul(op: Object): void {
        this.code += `imul ${op}` + "\n";
        this.countOperation++;
    }

    public xor(op1: Object, op2: Object): void {
        this.code += `xor ${op1}, ${op2}` + "\n";
        this.countOperation++;
    }
}