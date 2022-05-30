class FASMCodeWritterEditor{

    constructor (public fc: FASMCodeWritter) {

    }

    public add(res: IVertex, op1: IVertex, op2: IVertex){
        if(res.top === op1.top && res.top === op2.top){
            this.fc.add(res, res);
        } else if(op1.top.isEqual(op2.top)){
            this.fc.mov(res, op1);
            this.fc.add(res, res);
        } else if(res.top !== op1.top && res.top !== op2.top){
            this.fc.mov(res, op1);
            this.fc.add(res, op2);
        }else{
            this.fc.add(res.top === op1.top ? op1 : op2, res.top !== op1.top ? op1 : op2);
        }
    }

    public sub(res: IVertex, op1: IVertex, op2: IVertex){
        if(res.top === op1.top && res.top === op2.top || op1.top.isEqual(op2.top)){
            this.fc.xor(res, res);
        } else if(res.top === op1.top){
            this.fc.sub(res, op2);
        }
       else if(res.top !== op1.top && res.top !== op2.top){
            this.fc.mov(res, op1);
            this.fc.sub(res, op2);
        }else{
            this.fc.sub(res.top === op1.top ? op1 : op2, res.top !== op1.top ? op1 : op2);
        }
    }

    public mov(op1: IVertex, op2: IVertex): void{
        if(op1.top !== op2.top){
            this.fc.mov(op1, op2);
            op1.top = op2.top;            
        }
    }

    public idiv(op2: IVariable): void {
        this.fc.idiv(op2);
    }

    public swap(op1: IVariable, op2: IVariable): void {
        if(op1.top !== op2.top) {
            this.fc.swap(op1, op2);
            [op1.top, op2.top] = [op2.top, op1.top];
        }
    }

    public imul(op: IVariable): void{
        this.fc.imul(op);
    }
}