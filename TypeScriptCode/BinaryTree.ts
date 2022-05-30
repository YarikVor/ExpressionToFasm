class BinaryTree{
    public tops : Vertex[] = new Array<Vertex>();
    public variables: Vertex[] = new Array<Vertex>();
    private stackOperators: Operator[] = new Array<Operator>();
    private stackTops: Vertex[] = new Array<Vertex>();

    public static operators: any;

    private lastIndex: number;

    public static RegexTypes: RegExp[] = new Array<RegExp>(
        new RegExp(/[0-9]+/y),
        new RegExp(/[a-zA-Z]+/y),
        new RegExp(/\+|-|\/|\*|\^/y),
        new RegExp(/\(/y),
        new RegExp(/\)/y)
    );

    public CompileTextToTops(formula: string) : void{
        this.lastIndex = 0;
        while(this.lastIndex < formula.length){
            let i: number = 0;
            let execText: string;
            for(; i < BinaryTree.RegexTypes.length; i++){
                const rg: RegExp = BinaryTree.RegexTypes[i];
                rg.lastIndex = this.lastIndex;
                let regExec: RegExpExecArray = rg.exec(formula);
                if(regExec !== null){
                    execText = regExec[0];
                    this.lastIndex = rg.lastIndex;
                    break;
                }
            }
            switch(i){
                case typeTop.constant: 
                    this.AddNumber(execText);
                    break;

                case typeTop.variable:
                    this.AddVariable(execText);
                    break;

                case typeTop.openBracket:
                    this.AddOpenBracket(execText);
                    break;

                case typeTop.closeBracket:
                    this.AddCloseBracket(execText);
                    break;

                case typeTop.operator:
                    this.AddSign(execText);
                    break;

                default:
                    throw new Error(`Символ "${formula[this.lastIndex]}" на позиції ${this.lastIndex} - невідомий `);
            }
        }

        if(this.stackOperators.length !== 0){
            while(this.stackTops.length > 1){
                const top: Vertex = new Vertex(typeTop.operator, this.stackOperators.pop().chars, this.stackTops.pop(), this.stackTops.pop());
                this.stackTops.push(top);
                this.tops.push(top);
            }
        }
    }


    private AddNumber(str: string) : void{
        this.stackTops.push(new Vertex(typeTop.constant, str));  
    }

    private AddVariable(str: string) : void{
        let res : Vertex = this.variables.find(v => v.text === str);
        if(res === undefined){
            res = new Vertex(typeTop.variable, str);
            this.variables.push(res);
        }
        this.stackTops.push(res); 
    }

    private AddSign(str: string) : void{
        const res: Operator = Operator.GetOperator(str);
        if(this.stackOperators.length == 0 || this.stackOperators[this.stackOperators.length - 1].chars == "("){
            this.stackOperators.push(res);
        }else if(this.stackOperators[this.stackOperators.length - 1].priority < res.priority){
            this.stackOperators.push(res);
        }else {
            while(this.stackOperators.length !== 0 && this.stackOperators[this.stackOperators.length - 1].priority >= res.priority && this.stackOperators[this.stackOperators.length - 1].chars !== "("){
                const res: Vertex = new Vertex(typeTop.operator, this.stackOperators.pop().chars, this.stackTops.pop(), this.stackTops.pop());
                this.tops.push(res);
                this.stackTops.push(res);
            }
            this.stackOperators.push(res);
        }
    }

    private AddOpenBracket(str: string): void{
        this.stackOperators.push(Operator.GetOperator(str));
    }

    private AddCloseBracket(str: string): void{
        if(this.stackOperators.length !== 0){
            while(this.stackOperators.length !== 0 && this.stackOperators[this.stackOperators.length - 1].chars !== "("){
                const top: Vertex = new Vertex(typeTop.operator, this.stackOperators.pop().chars, this.stackTops.pop(), this.stackTops.pop());
                this.stackTops.push(top);
                this.tops.push(top);
            }
            this.stackOperators.pop();
        }
    }

    public Optimization(): void{
        for(let i = 0; i < this.tops.length; i++){
            const one: Vertex = this.tops[i];
            for(let j = i + 1; j < this.tops.length;){
                const that: Vertex = this.tops[j];
                if(one.isEqual(that)){
                    this.tops.splice(j, 1);
                    for(let k = i + 1; k < this.tops.length; k++){
                        this.tops[k].DeepReplaceAll(that, one);
                    }
                } else {
                    j++;
                }
            }
        }

    }

}