class Variable {
    constructor(name) {
        this.name = name;
        this.isAvailable = true;
        this.top = null;
    }
    get top() {
        return this._top;
    }
    set top(value) {
        this.isAvailable = value === null;
        this._top = value;
    }
    toString() {
        return this.name;
    }
    static CreateVariableBasedVertex(vtx) {
        let res = new Variable(vtx.text);
        res.top = vtx;
        return res;
    }
}
