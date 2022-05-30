enum typeTop {
    constant,
    variable,
    operator,
    openBracket,
    closeBracket
}


class Vertex implements IVertex{

    public top: Vertex = this;

    constructor (
        public type: typeTop,
        public text: string,
        public right: Vertex = null,
        public left: Vertex = null
    ){}

    public toString(): string{
        return this.text;
    }

    public isEqual(top: Vertex): boolean{
        if(this.text !== top.text) return false;
        if(this.left !== null && top.left !== null){
            if(this.left.isEqual(top.left) == false)
                return false;
        } else if ((this.left == null) !== (top.left == null)){
            return false;
        }
        if(this.right !== null && top.right !== null){
            if(this.right.isEqual(top.right) == false)
                return false;
        } else if ((this.right == null) !== (top.right == null)){
            return false;
        }
        return true;
    }

    public ReplaceAll(rep: Vertex, top: Vertex): boolean{
        let res: boolean = false;
        if(this.left === rep) {
            this.left = top;
            res = true;
        }
        if(this.right === rep){
            this.right = top;
            res = true;
        }
        return res;
    }
    public DeepReplaceAll(rep: Vertex, top: Vertex): boolean{
        let res: boolean = this.ReplaceAll(rep, top);
        if(this.left.ReplaceAll(rep, top)){
            res = true;
        }
        if(this.right.ReplaceAll(rep, top)){
            res = true;
        }
        return res;
    }

    public Avaible(top: Vertex): boolean{
        return this.right == top || this.left == top;
    }

    public IsChildrenConstants(): boolean{
        return this.left.type === typeTop.constant && this.right.type === typeTop.constant;
    }

    public IsChildrenVariables(): boolean{
        return this.left.type === typeTop.variable && this.right.type === typeTop.variable;
    }

    public GetFormulaString(): string{
        if(this.type === typeTop.constant || this.type === typeTop.variable){
            return this.text;
        } else {
            return `(${this.left.GetFormulaString()}${this.text}${this.right.GetFormulaString()})`;
        }
    }
}