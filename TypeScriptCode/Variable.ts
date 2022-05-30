class Variable implements IVariable, IVertex{
    public isAvailable: boolean = true;

    private _top: Vertex;

    public get top(): Vertex {
        return this._top;
    }
    public set top(value: Vertex) {
        this.isAvailable = value === null;
        this._top = value;
    }

    constructor(public name: string){
        this.top = null;
    }

    public toString(): string{
        return this.name;
    }

    public static CreateVariableBasedVertex(vtx: Vertex){
        let res: Variable = new Variable(vtx.text);
        res.top = vtx;
        return res;
    }
}