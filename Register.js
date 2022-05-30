class Register {
    constructor(name) {
        this.name = name;
        this.isMultiple = false;
        this.isDivided = false;
        this.isStable = true;
        this.isAvailable = true;
        this.isReserved = false;
        this.period = 0;
        this._top = null;
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
}
