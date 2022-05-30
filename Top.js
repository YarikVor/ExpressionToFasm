var typeTop;
(function (typeTop) {
    typeTop[typeTop["constant"] = 0] = "constant";
    typeTop[typeTop["variable"] = 1] = "variable";
    typeTop[typeTop["operator"] = 2] = "operator";
    typeTop[typeTop["openBracket"] = 3] = "openBracket";
    typeTop[typeTop["closeBracket"] = 4] = "closeBracket";
})(typeTop || (typeTop = {}));
class Vertex {
    constructor(type, text, right = null, left = null) {
        this.type = type;
        this.text = text;
        this.right = right;
        this.left = left;
        this.top = this;
    }
    toString() {
        return this.text;
    }
    isEqual(top) {
        if (this.text !== top.text)
            return false;
        if (this.left !== null && top.left !== null) {
            if (this.left.isEqual(top.left) == false)
                return false;
        }
        else if ((this.left == null) !== (top.left == null)) {
            return false;
        }
        if (this.right !== null && top.right !== null) {
            if (this.right.isEqual(top.right) == false)
                return false;
        }
        else if ((this.right == null) !== (top.right == null)) {
            return false;
        }
        return true;
    }
    ReplaceAll(rep, top) {
        let res = false;
        if (this.left === rep) {
            this.left = top;
            res = true;
        }
        if (this.right === rep) {
            this.right = top;
            res = true;
        }
        return res;
    }
    DeepReplaceAll(rep, top) {
        let res = this.ReplaceAll(rep, top);
        if (this.left.ReplaceAll(rep, top)) {
            res = true;
        }
        if (this.right.ReplaceAll(rep, top)) {
            res = true;
        }
        return res;
    }
    Avaible(top) {
        return this.right == top || this.left == top;
    }
    IsChildrenConstants() {
        return this.left.type === typeTop.constant && this.right.type === typeTop.constant;
    }
    IsChildrenVariables() {
        return this.left.type === typeTop.variable && this.right.type === typeTop.variable;
    }
    GetFormulaString() {
        if (this.type === typeTop.constant || this.type === typeTop.variable) {
            return this.text;
        }
        else {
            return `(${this.left.GetFormulaString()}${this.text}${this.right.GetFormulaString()})`;
        }
    }
}
