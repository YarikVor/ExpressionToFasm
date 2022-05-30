class Register implements IVariable{
    public isMultiple: boolean = false;
    public isDivided: boolean = false; 
    public isStable: boolean = true;

    public isAvailable: boolean = true;
    public isReserved: boolean = false;

    public period: number = 0;

    private _top: Vertex = null;

    public get top(): Vertex {
        return this._top;
    }
    public set top(value: Vertex) {
        this.isAvailable = value === null;
        this._top = value;
    }

    

    constructor(public name: string){}

    public toString(): string{
        return this.name;
    }
}