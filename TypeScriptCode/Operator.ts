class Operator{
    public static operators: Operator[] = new Array<Operator>(
        new Operator('+', 0),
        new Operator('-', 0),
        new Operator('*', 2),
        new Operator('/', 2),
        new Operator('^', 5),
        new Operator('(', 100),
        new Operator(')', 100)
    );

    constructor(public chars: string, public priority: number){}

    public static GetOperator(chars: string): Operator{
        return Operator.operators.find(e => e.chars === chars);
    }
}