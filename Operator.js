class Operator {
    constructor(chars, priority) {
        this.chars = chars;
        this.priority = priority;
    }
    static GetOperator(chars) {
        return Operator.operators.find(e => e.chars === chars);
    }
}
Operator.operators = new Array(new Operator('+', 0), new Operator('-', 0), new Operator('*', 2), new Operator('/', 2), new Operator('^', 5), new Operator('(', 100), new Operator(')', 100));
