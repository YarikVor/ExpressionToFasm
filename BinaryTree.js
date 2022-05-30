class BinaryTree {
    constructor() {
        this.tops = new Array();
        this.variables = new Array();
        this.stackOperators = new Array();
        this.stackTops = new Array();
    }
    CompileTextToTops(formula) {
        this.lastIndex = 0;
        while (this.lastIndex < formula.length) {
            let i = 0;
            let execText;
            for (; i < BinaryTree.RegexTypes.length; i++) {
                const rg = BinaryTree.RegexTypes[i];
                rg.lastIndex = this.lastIndex;
                let regExec = rg.exec(formula);
                if (regExec !== null) {
                    execText = regExec[0];
                    this.lastIndex = rg.lastIndex;
                    break;
                }
            }
            switch (i) {
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
        if (this.stackOperators.length !== 0) {
            while (this.stackTops.length > 1) {
                const top = new Vertex(typeTop.operator, this.stackOperators.pop().chars, this.stackTops.pop(), this.stackTops.pop());
                this.stackTops.push(top);
                this.tops.push(top);
            }
        }
    }
    AddNumber(str) {
        this.stackTops.push(new Vertex(typeTop.constant, str));
    }
    AddVariable(str) {
        let res = this.variables.find(v => v.text === str);
        if (res === undefined) {
            res = new Vertex(typeTop.variable, str);
            this.variables.push(res);
        }
        this.stackTops.push(res);
    }
    AddSign(str) {
        const res = Operator.GetOperator(str);
        if (this.stackOperators.length == 0 || this.stackOperators[this.stackOperators.length - 1].chars == "(") {
            this.stackOperators.push(res);
        }
        else if (this.stackOperators[this.stackOperators.length - 1].priority < res.priority) {
            this.stackOperators.push(res);
        }
        else {
            while (this.stackOperators.length !== 0 && this.stackOperators[this.stackOperators.length - 1].priority >= res.priority && this.stackOperators[this.stackOperators.length - 1].chars !== "(") {
                const res = new Vertex(typeTop.operator, this.stackOperators.pop().chars, this.stackTops.pop(), this.stackTops.pop());
                this.tops.push(res);
                this.stackTops.push(res);
            }
            this.stackOperators.push(res);
        }
    }
    AddOpenBracket(str) {
        this.stackOperators.push(Operator.GetOperator(str));
    }
    AddCloseBracket(str) {
        if (this.stackOperators.length !== 0) {
            while (this.stackOperators.length !== 0 && this.stackOperators[this.stackOperators.length - 1].chars !== "(") {
                const top = new Vertex(typeTop.operator, this.stackOperators.pop().chars, this.stackTops.pop(), this.stackTops.pop());
                this.stackTops.push(top);
                this.tops.push(top);
            }
            this.stackOperators.pop();
        }
    }
    Optimization() {
        for (let i = 0; i < this.tops.length; i++) {
            const one = this.tops[i];
            for (let j = i + 1; j < this.tops.length;) {
                const that = this.tops[j];
                if (one.isEqual(that)) {
                    this.tops.splice(j, 1);
                    for (let k = i + 1; k < this.tops.length; k++) {
                        this.tops[k].DeepReplaceAll(that, one);
                    }
                }
                else {
                    j++;
                }
            }
        }
    }
}
BinaryTree.RegexTypes = new Array(new RegExp(/[0-9]+/y), new RegExp(/[a-zA-Z]+/y), new RegExp(/\+|-|\/|\*|\^/y), new RegExp(/\(/y), new RegExp(/\)/y));
