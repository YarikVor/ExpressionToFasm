class FASMCompilator {
    constructor(tops, nameVar) {
        this.tops = tops;
        this.nameVar = nameVar;
        this.fc = new FASMCodeWritter();
        this.fcw = new FASMCodeWritterEditor(this.fc);
        this.lastIndexTop = 0;
        this.settingPeriodLoadVariable = 10;
        this.settingPeriodLoadOperator = 3;
        this.settingUseMinPeriod = false;
        this.registers = new Array(new Register("AX"), new Register("BX"), new Register("CX"), new Register("DX"));
        this.AX = this.registers[0];
        this.BX = this.registers[1];
        this.CX = this.registers[2];
        this.DX = this.registers[3];
        this.variables = new Array();
        this.Init();
    }
    Init() {
        this.registers[0].isMultiple = true;
        this.registers[0].isDivided = true;
        this.registers[3].isStable = false;
    }
    Compilation() {
        for (let i = 0; i < this.tops.length; i++) {
            this.lastIndexTop = i;
            if (this.tops[i].type === typeTop.operator) {
                if (this.tops[i].left !== null && this.tops[i].right !== null) {
                    if (this.tops[i].text === "+") {
                        this.Add(this.tops[i]);
                    }
                }
            }
        }
        return this.fc.code;
    }
    Step() {
        this.fc.code += "; " + (this.lastIndexTop + 1) + "\n";
        let i = this.lastIndexTop;
        if (this.tops[i].type === typeTop.operator) {
            if (this.tops[i].left !== null && this.tops[i].right !== null) {
                if (this.tops[i].text === "+") {
                    this.Add(this.tops[i]);
                }
                else if (this.tops[i].text === "-") {
                    this.Sub(this.tops[i]);
                }
                else if (this.tops[i].text === "/") {
                    this.Idiv(this.tops[i]);
                }
                else if (this.tops[i].text === "*") {
                    this.Imul(this.tops[i]);
                }
            }
        }
        this.lastIndexTop++;
    }
    findIndexVertex(vtx) {
        for (let i = 0; i < this.tops.length; i++) {
            if (this.tops[i] === vtx)
                return i;
        }
        return -1;
    }
    Add(top) {
        if (top.left.type === typeTop.constant && top.right.type === typeTop.constant) {
            this.AddConstants(top);
        }
        else if (top.left.type === typeTop.operator && top.right.type === typeTop.constant || top.left.type === typeTop.constant && top.right.type === typeTop.operator) {
            this.AddOperatorAndConstant(top);
        }
        else if (top.left.type === typeTop.operator && top.right.type === typeTop.operator) {
            this.AddOperators(top);
        }
        else if ((top.left.type === typeTop.constant && top.right.type === typeTop.variable) ||
            (top.right.type === typeTop.constant && top.left.type === typeTop.variable)) {
            this.AddVariableAndConstant(top);
        }
        else if (top.right.type === typeTop.variable && top.left.type === typeTop.variable) {
            this.AddVariables(top);
        }
        else if (top.right.type === typeTop.variable && top.left.type === typeTop.operator ||
            top.right.type === typeTop.operator && top.left.type === typeTop.variable) {
            this.AddOperatorAndVariable(top);
        }
        else {
            throw new Error("Error: Unknown operator");
        }
    }
    AddConstants(top) {
        let reg = this.DumpRegister();
        this.fcw.add(reg, top.left, top.right);
        reg.top = top;
    }
    AddOperators(top) {
        let left = this.FindRegisterByTop(top.left);
        let right = this.FindRegisterByTop(top.right);
        let regRes;
        let isLeftUse = this.GetPeriodTopUseNumber(top.left, this.settingPeriodLoadOperator);
        let isRightUse = this.GetPeriodTopUseNumber(top.right, this.settingPeriodLoadOperator);
        if (left !== null && right !== null) {
            if (this.SomeAvaibleRegister() && this.IsPeriodTop(top.left) && this.IsPeriodTop(top.right)) {
                regRes = this.DumpRegister(left, right);
            }
            else {
                if (isLeftUse == false) {
                    regRes = left;
                    if (this.GetPeriodTop(regRes.top) !== Number.POSITIVE_INFINITY) {
                        let temp = this.CreateTempVariable();
                        this.fcw.mov(temp, regRes.top);
                    }
                }
                else if (isRightUse == false) {
                    regRes = right;
                    if (this.GetPeriodTop(regRes.top) !== Number.POSITIVE_INFINITY) {
                        let temp = this.CreateTempVariable();
                        this.fcw.mov(temp, regRes.top);
                    }
                }
                else {
                    regRes = this.DumpRegister(left, right);
                }
            }
        }
        else {
            if (left === null) {
                left = this.FindVariableByTop(top.left);
                if (left === null)
                    throw new Error("Error: Cannot find variable");
                if (isLeftUse) {
                    let temp = this.DumpRegister(right);
                    this.fcw.mov(temp, left);
                    temp.top = left.top;
                    left = temp;
                }
            }
            if (right === null) {
                right = this.FindVariableByTop(top.right);
                if (right === null) {
                    throw new Error("Error: Cannot find variable");
                }
                if (isRightUse) {
                    let temp = this.DumpRegister(left);
                    this.fcw.mov(temp, right);
                    temp.top = right.top;
                    right = temp;
                }
            }
            if (left instanceof Register && isLeftUse === false) {
                regRes = left;
            }
            else if (right instanceof Register && isRightUse === false) {
                regRes = right;
            }
            else {
                regRes = this.DumpRegister(left, right);
            }
        }
        this.fcw.add(regRes, left, right);
        regRes.top = top;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(left);
            this.CheckUseVertex(right);
        }
    }
    AddOperatorAndConstant(top) {
        let op;
        let c;
        [op, c] = top.left.type === typeTop.operator ? [top.left, top.right] : [top.right, top.left];
        let left = this.FindRegisterByTop(op);
        let regRes;
        let isLeftUse = this.GetPeriodTopUseNumber(op, this.settingPeriodLoadOperator);
        if (left !== null) {
            if (isLeftUse == false) {
                regRes = left;
                if (this.GetPeriodTop(regRes.top) !== Number.POSITIVE_INFINITY) {
                    let temp = this.CreateTempVariable();
                    this.fcw.mov(temp, regRes.top);
                }
            }
            else {
                regRes = this.DumpRegister(left);
            }
        }
        else {
            left = this.FindVariableByTop(op);
            if (left === null)
                throw new Error("Error: Cannot find operator");
            if (isLeftUse) {
                let temp = this.DumpRegister();
                this.fcw.mov(temp, left);
                temp.top = left.top;
                left = temp;
            }
        }
        if (regRes === null) {
            regRes = this.DumpRegister(left);
        }
        this.fcw.add(regRes, left, c);
        regRes.top = top;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(left);
        }
    }
    AddVariableAndConstant(top) {
        let varib;
        let c;
        let pos = top.left.type === typeTop.variable;
        [varib, c] = top.left.type === typeTop.variable ? [top.left, top.right] : [top.right, top.left];
        let left = this.FindRegisterByTop(varib);
        let regRes = null;
        let isLeftUse = this.GetPeriodTopUseNumber(varib, this.settingPeriodLoadOperator);
        if (left !== null) {
            if (isLeftUse == false) {
                regRes = left;
            }
        }
        else {
            if (isLeftUse) {
                let temp = this.DumpRegister();
                this.fcw.mov(temp, varib);
                temp.top = varib.top;
                left = temp;
            }
            else {
                left = new Variable(varib.text);
                left.top = varib;
            }
        }
        if (regRes == null) {
            regRes = this.DumpRegister(left);
        }
        regRes.top = top;
        if (pos) {
            this.fcw.add(regRes, left, c);
        }
        else {
            this.fcw.add(regRes, c, left);
        }
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(left);
        }
    }
    SomeAvaibleRegister() {
        for (let i = 0; i < this.registers.length; i++) {
            if (this.registers[i].isAvailable) {
                return true;
            }
        }
        return false;
    }
    AddVariables(vtx) {
        let left = this.FindRegisterByTop(vtx.left);
        let right = this.FindRegisterByTop(vtx.right);
        let regRes;
        let isLeftUse = this.GetPeriodTopUseNumber(vtx.left, this.settingPeriodLoadVariable);
        let isRightUse = this.GetPeriodTopUseNumber(vtx.right, this.settingPeriodLoadVariable);
        if (left !== null && right !== null) {
            if (isLeftUse == false) {
                regRes = left;
            }
            else if (isRightUse == false) {
                regRes = right;
            }
            else {
                regRes = this.DumpRegister(left, right);
            }
        }
        else {
            if (vtx.left === vtx.right) {
                if (isLeftUse) {
                    let temp = this.DumpRegister(right);
                    this.fcw.mov(temp, vtx.left);
                    temp.top = vtx.left.top;
                    left = temp;
                    right = temp;
                }
                else {
                    left = vtx.left;
                    right = vtx.right;
                }
            }
            else {
                if (left === null) {
                    if (isLeftUse) {
                        let temp = this.DumpRegister(right);
                        this.fcw.mov(temp, vtx.left);
                        temp.top = vtx.left.top;
                        left = temp;
                    }
                    else {
                        left = vtx.left;
                    }
                }
                if (right === null) {
                    if (isRightUse) {
                        let temp = this.DumpRegister(left);
                        this.fcw.mov(temp, vtx.right);
                        temp.top = vtx.right.top;
                        right = temp;
                    }
                    else {
                        right = vtx.right;
                    }
                }
            }
            if (left instanceof Register && isLeftUse === false) {
                regRes = left;
            }
            else if (right instanceof Register && isRightUse === false) {
                regRes = right;
            }
            else {
                regRes = this.DumpRegister(left, right);
            }
        }
        this.fcw.add(regRes, left, right);
        regRes.top = vtx;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(left);
            this.CheckUseVertex(right);
        }
    }
    AddOperatorAndVariable(vtx) {
        let varib;
        let op;
        let pos = vtx.left.type === typeTop.variable;
        [varib, op] = pos ? [vtx.left, vtx.right] : [vtx.right, vtx.left];
        let left = this.FindRegisterByTop(varib);
        let right = this.FindRegisterByTop(op);
        let regRes;
        let isLeftUse = this.GetPeriodTopUseNumber(varib, this.settingPeriodLoadVariable);
        let isRightUse = this.GetPeriodTopUseNumber(op, this.settingPeriodLoadOperator);
        if (left !== null && right !== null) {
            if (this.SomeAvaibleRegister() && this.IsPeriodTop(vtx.left) && this.IsPeriodTop(vtx.right) === false) {
                if (isLeftUse == false) {
                    regRes = left;
                }
                else if (isRightUse == false) {
                    regRes = right;
                    if (this.GetPeriodTop(regRes.top) !== Number.POSITIVE_INFINITY) {
                        let temp = this.CreateTempVariable();
                        this.fcw.mov(temp, regRes.top);
                    }
                }
            }
        }
        else {
            if (left === null) {
                if (isLeftUse) {
                    let temp = this.DumpRegister(right);
                    this.fcw.mov(temp, varib);
                    temp.top = varib.top;
                    left = temp;
                }
                else {
                    left = new Variable(varib.text);
                    left.top = varib.top;
                }
            }
            if (right === null) {
                right = this.FindVariableByTop(vtx.right);
                if (right === null) {
                    throw new Error("Error: Cannot find variable");
                }
                if (isRightUse) {
                    let temp = this.DumpRegister(left);
                    this.fcw.mov(temp, right);
                    temp.top = right.top;
                    right = temp;
                }
            }
        }
        if (this.SomeAvaibleRegister() && this.IsPeriodTop(vtx.left) && this.IsPeriodTop(vtx.right)) {
            regRes = this.DumpRegister(left, right);
        }
        else {
            if (pos == false) {
                if (right instanceof Register && isRightUse == false) {
                    regRes = right;
                }
                else if (left instanceof Register && isLeftUse == false) {
                    regRes = left;
                }
                else {
                    regRes = this.DumpRegister(left, right);
                }
            }
            else {
                if (left instanceof Register && isLeftUse == false) {
                    regRes = left;
                }
                else if (right instanceof Register && isRightUse == false) {
                    regRes = right;
                }
                else {
                    regRes = this.DumpRegister(left, right);
                }
            }
        }
        if (pos === false) {
            this.fcw.add(regRes, left, right);
        }
        else {
            this.fcw.add(regRes, right, left);
        }
        regRes.top = vtx;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(left);
            this.CheckUseVertex(right);
        }
    }
    Sub(top) {
        if (top.left.type === typeTop.constant && top.right.type === typeTop.constant) {
            this.SubConstants(top);
        }
        else if (top.left.type === typeTop.operator && top.right.type === typeTop.constant || top.left.type === typeTop.constant && top.right.type === typeTop.operator) {
            this.SubOperatorAndConstant(top);
        }
        else if (top.left.type === typeTop.operator && top.right.type === typeTop.operator) {
            this.SubOperators(top);
        }
        else if ((top.left.type === typeTop.constant && top.right.type === typeTop.variable) ||
            (top.right.type === typeTop.constant && top.left.type === typeTop.variable)) {
            this.SubVariableAndConstant(top);
        }
        else if (top.right.type === typeTop.variable && top.left.type === typeTop.variable) {
            this.SubVariables(top);
        }
        else if (top.right.type === typeTop.variable && top.left.type === typeTop.operator ||
            top.right.type === typeTop.operator && top.left.type === typeTop.variable) {
            this.SubOperatorAndVariable(top);
        }
        else {
            throw new Error("Error: Unknown operator for sub-expression");
        }
    }
    SubConstants(top) {
        let reg = this.DumpRegister();
        this.fcw.sub(reg, top.left, top.right);
        reg.top = top;
    }
    SubOperators(top) {
        let left = this.FindRegisterByTop(top.left);
        let right = this.FindRegisterByTop(top.right);
        let regRes;
        let isLeftUse = this.GetPeriodTopUseNumber(top.left, this.settingPeriodLoadOperator);
        let isRightUse = this.GetPeriodTopUseNumber(top.right, this.settingPeriodLoadOperator);
        if (left !== null && right !== null) {
            if (this.SomeAvaibleRegister() && this.IsPeriodTop(top.left) && this.IsPeriodTop(top.right)) {
                regRes = this.DumpRegister(left, right);
            }
            else {
                if (isLeftUse == false) {
                    regRes = left;
                    if (this.GetPeriodTop(regRes.top) !== Number.POSITIVE_INFINITY) {
                        let temp = this.CreateTempVariable();
                        this.fcw.mov(temp, regRes.top);
                    }
                }
                else {
                    regRes = this.DumpRegister(left, right);
                }
            }
        }
        else {
            if (left === null) {
                left = this.FindVariableByTop(top.left);
                if (left === null)
                    throw new Error("Error: Cannot find variable");
                if (isLeftUse) {
                    let temp = this.DumpRegister(right);
                    this.fcw.mov(temp, left);
                    temp.top = left.top;
                    left = temp;
                }
            }
            if (right === null) {
                right = this.FindVariableByTop(top.right);
                if (right === null) {
                    throw new Error("Error: Cannot find variable");
                }
                if (isRightUse) {
                    let temp = this.DumpRegister(left);
                    this.fcw.mov(temp, right);
                    temp.top = right.top;
                    right = temp;
                }
            }
            if (left instanceof Register && isLeftUse === false) {
                regRes = left;
            }
            else {
                regRes = this.DumpRegister(left, right);
            }
        }
        this.fcw.sub(regRes, left, right);
        regRes.top = top;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(left);
            this.CheckUseVertex(right);
        }
    }
    SubOperatorAndConstant(top) {
        let op;
        let c;
        let pos = top.left.type === typeTop.operator;
        [op, c] = pos ? [top.left, top.right] : [top.right, top.left];
        let left = this.FindRegisterByTop(op);
        let regRes = null;
        let isLeftUse = this.GetPeriodTopUseNumber(op, this.settingPeriodLoadOperator);
        if (left !== null) {
            if (isLeftUse == false && pos) {
                regRes = left;
                if (this.GetPeriodTop(regRes.top) !== Number.POSITIVE_INFINITY) {
                    let temp = this.CreateTempVariable();
                    this.fcw.mov(temp, regRes.top);
                }
            }
        }
        else {
            left = this.FindVariableByTop(op);
            if (left === null)
                throw new Error("Error: Cannot find operator");
            if (isLeftUse) {
                let temp = this.DumpRegister();
                this.fcw.mov(temp, left);
                temp.top = left.top;
                left = temp;
            }
        }
        if (regRes === null) {
            regRes = this.DumpRegister(left);
        }
        this.fcw.sub(regRes, left, c);
        regRes.top = top;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(left);
        }
    }
    SubVariableAndConstant(top) {
        let varib;
        let c;
        let pos = top.left.type === typeTop.variable;
        [varib, c] = pos ? [top.left, top.right] : [top.right, top.left];
        let left = this.FindRegisterByTop(varib);
        let regRes = null;
        let isLeftUse = this.GetPeriodTopUseNumber(varib, this.settingPeriodLoadVariable);
        if (left !== null) {
            if (isLeftUse == false && pos) {
                regRes = left;
            }
        }
        else {
            if (isLeftUse) {
                let temp = this.DumpRegister();
                this.fcw.mov(temp, varib);
                temp.top = varib.top;
                left = temp;
            }
            else {
                left = new Variable(varib.text);
                left.top = varib;
            }
        }
        if (regRes === null) {
            regRes = this.DumpRegister(left);
        }
        this.fcw.sub(regRes, left, c);
        regRes.top = top;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(left);
        }
    }
    SubVariables(vtx) {
        let left = this.FindRegisterByTop(vtx.left);
        let right = this.FindRegisterByTop(vtx.right);
        let regRes;
        let isLeftUse = this.GetPeriodTopUseNumber(vtx.left, this.settingPeriodLoadVariable);
        let isRightUse = this.GetPeriodTopUseNumber(vtx.right, this.settingPeriodLoadVariable);
        if (left !== null && right !== null) {
            if (isLeftUse == false) {
                regRes = left;
            }
        }
        else {
            if (vtx.left === vtx.right) {
                if (isLeftUse) {
                    let temp = this.DumpRegister(right);
                    this.fcw.mov(temp, vtx.left);
                    temp.top = vtx.left.top;
                    left = temp;
                    right = temp;
                }
                else {
                    left = vtx.left;
                    right = vtx.right;
                }
            }
            else {
                if (left === null) {
                    if (isLeftUse) {
                        let temp = this.DumpRegister(right);
                        this.fcw.mov(temp, vtx.left);
                        temp.top = vtx.left.top;
                        left = temp;
                    }
                    else {
                        left = vtx.left;
                    }
                }
                if (right === null) {
                    if (isRightUse) {
                        let temp = this.DumpRegister(left);
                        this.fcw.mov(temp, vtx.right);
                        temp.top = vtx.right.top;
                        right = temp;
                    }
                    else {
                        right = vtx.right;
                    }
                }
            }
            if (left instanceof Register && isLeftUse === false) {
                regRes = left;
            }
            else if (right instanceof Register && isRightUse === false) {
                regRes = right;
            }
            else {
                regRes = this.DumpRegister(left, right);
            }
        }
        this.fcw.sub(regRes, left, right);
        regRes.top = vtx;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(left);
            this.CheckUseVertex(right);
        }
    }
    SubOperatorAndVariable(vtx) {
        let varib;
        let op;
        let pos = vtx.left.type === typeTop.variable;
        [varib, op] = pos ? [vtx.left, vtx.right] : [vtx.right, vtx.left];
        let left = this.FindRegisterByTop(varib);
        let right = this.FindRegisterByTop(op);
        let regRes;
        let isLeftUse = this.GetPeriodTopUseNumber(varib, this.settingPeriodLoadVariable);
        let isRightUse = this.GetPeriodTopUseNumber(op, this.settingPeriodLoadOperator);
        if (left !== null && right !== null) {
            if (this.SomeAvaibleRegister() && this.IsPeriodTop(vtx.left) && this.IsPeriodTop(vtx.right) === false) {
                if (isLeftUse == false) {
                    regRes = left;
                }
            }
        }
        else {
            if (left === null) {
                if (isLeftUse) {
                    let temp = this.DumpRegister(right);
                    this.fcw.mov(temp, varib);
                    temp.top = varib.top;
                    left = temp;
                }
                else {
                    left = new Variable(varib.text);
                    left.top = varib.top;
                }
            }
            if (right === null) {
                right = this.FindVariableByTop(vtx.right);
                if (right === null) {
                    throw new Error("Error: Cannot find variable");
                }
                if (isRightUse) {
                    let temp = this.DumpRegister(left);
                    this.fcw.mov(temp, right);
                    temp.top = right.top;
                    right = temp;
                }
            }
        }
        if (this.SomeAvaibleRegister() && this.IsPeriodTop(vtx.left) && this.IsPeriodTop(vtx.right)) {
            regRes = this.DumpRegister(left, right);
        }
        else {
            if (pos == false) {
                if (right instanceof Register && isRightUse == false) {
                    regRes = right;
                }
                else {
                    regRes = this.DumpRegister(left, right);
                }
            }
            else {
                if (left instanceof Register && isLeftUse == false) {
                    regRes = left;
                }
                else {
                    regRes = this.DumpRegister(left, right);
                }
            }
        }
        if (pos === false) {
            this.fcw.sub(regRes, right, left);
        }
        else {
            this.fcw.sub(regRes, left, right);
        }
        regRes.top = vtx;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(left);
            this.CheckUseVertex(right);
        }
    }
    Idiv(top) {
        if (top.left.type === typeTop.constant && top.right.type === typeTop.constant) {
            this.IdivConstants(top);
        }
        else if (top.left.type === typeTop.operator && top.right.type === typeTop.constant) {
            this.IdivOperatorAndConstant(top);
        }
        else if (top.left.type === typeTop.constant && top.right.type === typeTop.operator) {
            this.IdivConstantAndOperator(top);
        }
        else if (top.left.type === typeTop.operator && top.right.type === typeTop.operator) {
            this.IdivOperators(top);
        }
        else if (top.right.type === typeTop.constant && top.left.type === typeTop.variable) {
            this.IdivVariableAndConstant(top);
        }
        else if (top.left.type === typeTop.constant && top.right.type === typeTop.variable) {
            this.IdivConstantAndVariable(top);
        }
        else if (top.right.type === typeTop.variable && top.left.type === typeTop.variable) {
            this.IdivVariables(top);
        }
        else if (top.right.type === typeTop.variable && top.left.type === typeTop.operator) {
            this.IdivOperatorAndVariable(top);
        }
        else if (top.right.type === typeTop.operator && top.left.type === typeTop.variable) {
            this.IdivVariableAndOperator(top);
        }
        else {
            throw new Error("Error: Unknown operator for idiv-expression");
        }
        this.AX.top = top;
        this.ChackUseAllVertex();
    }
    IdivConstants(vtx) {
        let divided = this.registers[0];
        this.FreeRegister(divided);
        this.fc.mov(divided, vtx.left);
        this.FreeRegister(this.registers[3]);
        let divider = this.DumpRegister(divided, this.registers[3]);
        this.fc.mov(divider, vtx.right);
        divided.top = vtx.left;
        divider.top = vtx.right;
        this.fcw.idiv(divider);
        divided.top = vtx;
    }
    IdivOperators(vtx) {
        var _a, _b;
        let dilene = (_a = this.FindRegisterByTop(vtx.left)) !== null && _a !== void 0 ? _a : this.FindVariableByTop(vtx.left);
        let dilnyk = (_b = this.FindRegisterByTop(vtx.right)) !== null && _b !== void 0 ? _b : this.FindVariableByTop(vtx.right);
        if (dilene instanceof Register && dilnyk instanceof Register) {
            if (dilene.top !== this.registers[0].top) {
                if (dilnyk.top === this.registers[0].top) {
                    this.fcw.swap(dilene, dilnyk);
                    [dilene, dilnyk] = [dilnyk, dilene];
                }
                else {
                    this.fcw.swap(dilene, this.registers[0]);
                    dilene = this.AX;
                }
            }
            if (dilnyk.top === this.DX.top) {
                let temp = this.DumpRegister(this.registers[0], this.registers[3]);
                this.fcw.mov(temp, dilnyk);
                dilnyk.top = null;
                dilnyk = temp;
            }
            else {
                this.FreeRegister(this.DX);
            }
            if (this.IsPeriodTop(dilene.top)) {
                if (this.GetPeriodTopUseNumber(dilene.top, this.settingPeriodLoadOperator)) {
                    let temp = this.DumpRegister(this.registers[0], this.registers[3], dilnyk);
                    this.fcw.mov(temp, dilene);
                }
                else {
                    let varib = this.CreateTempVariable();
                    this.fcw.mov(varib, dilene);
                }
            }
        }
        else if (dilene instanceof Register) {
            if (dilene.top !== this.AX.top) {
                this.fcw.swap(dilene, this.AX);
                dilene = this.AX;
            }
            this.FreeRegister(this.registers[3]);
            let dumpForDilene;
            if (this.IsPeriodTop(dilene.top)) {
                if (this.GetPeriodTopUseNumber(dilene.top, this.settingPeriodLoadOperator)) {
                    dumpForDilene = this.DumpRegister(this.registers[0], this.registers[3]);
                    this.fcw.mov(dumpForDilene, dilene);
                }
                else {
                    let varib = this.CreateTempVariable();
                    this.fcw.mov(varib, dilene);
                }
            }
            if (this.IsPeriodTop(dilnyk.top)) {
                if (this.GetPeriodTopUseNumber(dilnyk.top, this.settingPeriodLoadOperator)) {
                    let temp = this.DumpRegister(this.registers[0], this.registers[3], dumpForDilene);
                    this.fcw.mov(temp, dilnyk);
                    dilnyk = temp;
                }
            }
        }
        else if (dilnyk instanceof Register) {
            if (dilnyk === this.AX) {
                let temp = this.DumpRegister(this.AX, this.DX);
                this.fcw.mov(temp, dilnyk);
                this.FreeRegister(this.DX);
                this.fcw.mov(dilnyk, dilene);
                dilene = dilnyk;
                dilnyk = temp;
                if (this.IsPeriodTop(dilene.top)) {
                    if (this.GetPeriodTopUseNumber(dilene.top, this.settingPeriodLoadOperator)) {
                        let temp = this.DumpRegister(this.AX, this.DX, dilnyk);
                        this.fc.mov(temp, dilene);
                    }
                }
            }
        }
        else {
            this.fcw.swap(this.AX, dilene);
            dilene = this.AX;
            let dumpDilene = null;
            this.FreeRegister(this.DX);
            if (this.IsPeriodTop(dilene.top)) {
                if (this.GetPeriodTopUseNumber(dilene.top, this.settingPeriodLoadOperator)) {
                    dumpDilene = this.DumpRegister(this.AX, this.DX, dilnyk);
                    this.fcw.mov(dumpDilene, dilene);
                }
            }
            if (this.IsPeriodTop(dilnyk.top)) {
                if (this.GetPeriodTopUseNumber(dilnyk.top, this.settingPeriodLoadOperator)) {
                    let tmp = this.DumpRegister(this.AX, this.DX, dumpDilene);
                    this.fcw.mov(tmp, dilene);
                }
            }
        }
        if (dilene !== this.AX)
            throw new Error("Error: Dilene is not AX");
        this.fcw.idiv(dilnyk);
        dilene.top = vtx;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(this.AX);
            this.CheckUseVertex(this.BX);
            this.CheckUseVertex(this.CX);
            this.CheckUseVertex(this.DX);
        }
    }
    IdivConstantAndOperator(vtx) {
        var _a;
        let op = (_a = this.FindRegisterByTop(vtx.right)) !== null && _a !== void 0 ? _a : this.FindVariableByTop(vtx.right);
        let c;
        if (op === null) {
            throw new Error("Error: Unknown IVariable");
        }
        if (op instanceof Register) {
            let temp = null;
            if (op === this.AX) {
                temp = this.DumpRegister(this.AX, this.DX);
                this.fcw.mov(temp, op);
                op = temp;
                this.fcw.mov(this.AX, vtx.left);
                c = this.AX;
            }
            else if (op === this.DX) {
                temp = this.DumpRegister(this.DX, this.AX);
                this.fcw.mov(temp, op);
                op = temp;
                this.FreeRegister(this.AX, this.AX, this.DX, op);
                this.fcw.mov(this.AX, vtx.left);
                c = this.AX;
            }
        }
        else {
            if (this.IsPeriodTop(op.top)) {
                if (this.GetPeriodTopUseNumber(op.top, this.settingPeriodLoadOperator)) {
                    let temp = this.DumpRegister(this.AX, this.DX);
                    this.fcw.mov(temp, op);
                    op = temp;
                }
            }
        }
        if (c !== this.AX) {
            this.FreeRegister(this.AX, this.AX, this.DX, op);
            this.fcw.mov(this.AX, vtx.left);
            c = this.AX;
        }
        this.FreeRegister(this.DX, this.AX, this.DX, op);
        this.fcw.idiv(op);
        c.top = vtx;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(this.AX);
            this.CheckUseVertex(this.BX);
            this.CheckUseVertex(this.CX);
            this.CheckUseVertex(this.DX);
        }
    }
    IdivOperatorAndConstant(vtx) {
        var _a;
        let op = (_a = this.FindRegisterByTop(vtx.left)) !== null && _a !== void 0 ? _a : this.FindVariableByTop(vtx.left);
        let tempOp = null;
        if (op === null) {
            throw new Error("Error: Unknown variable operator");
        }
        let c;
        if (op instanceof Register) {
            if (op !== this.AX) {
                this.fcw.mov(this.AX, op);
            }
            if (op === this.DX) {
                if (this.IsPeriodTop(op.top)) {
                    if (this.GetPeriodTopUseNumber(op.top, this.settingPeriodLoadOperator)) {
                        tempOp = this.DumpRegister(this.AX, this.DX);
                        this.fcw.mov(tempOp, op);
                    }
                    else {
                        this.MoveRegisterToVariable(op);
                    }
                }
                op.top = null;
            }
            op = this.AX;
        }
        else {
            this.FreeRegister(this.AX, this.AX, this.DX);
            this.fcw.mov(this.AX, op);
            if (this.IsPeriodTop(op.top)) {
                if (this.GetPeriodTopUseNumber(op.top, this.settingPeriodLoadOperator)) {
                    tempOp = this.DumpRegister(this.AX, this.DX);
                    this.fcw.mov(tempOp, op);
                }
                else {
                    this.MoveRegisterToVariable(op);
                }
            }
        }
        c = this.DumpRegister(this.AX, this.DX, tempOp);
        this.CloneOperatorInRegisters(this.AX, this.AX, c, this.DX);
        this.fcw.mov(c, vtx.right);
        this.MoveRegisterToVariable(this.DX);
        this.fcw.idiv(c);
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(this.AX);
            this.CheckUseVertex(this.BX);
            this.CheckUseVertex(this.CX);
            this.CheckUseVertex(this.DX);
        }
    }
    IdivConstantAndVariable(top) {
        let right = this.FindRegisterByTop(top.right);
        if (right === null) {
            right = new Variable(top.right.text);
            right.top = top.right;
            let temp = this.CloneVariableInRegisters(right, this.AX, this.DX);
            if (temp !== null) {
                temp.top = right.top;
                right = temp;
            }
        }
        else {
            let temp = this.CloneVariableInRegisters(right, this.AX, this.DX);
            if (temp !== null) {
                temp.top = right.top;
                right = temp;
            }
        }
        this.FreeRegister(this.AX, this.AX, this.DX, right);
        this.fcw.mov(this.AX, top.left);
        this.fcw.idiv(right);
        this.AX.top = top;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(this.AX);
            this.CheckUseVertex(this.BX);
            this.CheckUseVertex(this.CX);
            this.CheckUseVertex(this.DX);
        }
    }
    IdivVariableAndConstant(top) {
        let left = this.FindRegisterByTop(top.left);
        if (left === null) {
            left = new Variable(top.left.text);
            left.top = top.left;
            this.FreeRegister(this.AX, this.AX, this.DX);
            this.fcw.mov(this.AX, left);
            left = this.AX;
        }
        else if (left !== this.AX) {
            this.FreeRegister(this.AX, this.AX, this.DX);
            this.fcw.mov(this.AX, left);
            left = this.AX;
        }
        let temp = this.CloneVariableInRegisters(left, this.AX, this.DX);
        if (temp !== null) {
            temp.top = left.top;
        }
        this.FreeRegister(this.DX, this.AX, this.DX);
        let right = this.DumpRegister(this.AX, this.DX, temp);
        this.fcw.mov(right, top.right);
        this.fcw.idiv(right);
        left.top = top;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(this.AX);
            this.CheckUseVertex(this.BX);
            this.CheckUseVertex(this.CX);
            this.CheckUseVertex(this.DX);
        }
    }
    IdivVariables(vtx) {
        let left = this.FindRegisterByTop(vtx.left);
        let right = this.FindRegisterByTop(vtx.right);
        if (left === null) {
            left = new Variable(vtx.left.text);
            left.top = vtx.left;
        }
        if (right === null) {
            right = new Variable(vtx.right.text);
            right.top = vtx.right;
        }
        if (left instanceof Register) {
            if (right === this.AX) {
                this.fcw.swap(left, right);
                [left, right] = [right, left];
            }
            else if (left !== this.AX) {
                this.FreeRegister(this.AX, this.AX, this.DX, right);
                this.fcw.mov(this.AX, left);
                left = this.AX;
            }
        }
        else {
            if (right instanceof Register) {
                if (right === this.AX) {
                    let temp = this.CloneVariableInRegisters(right, this.AX, this.DX);
                    if (temp === null) {
                        right = new Variable(vtx.right.text);
                        right.top = vtx.right;
                    }
                    else {
                        right = temp;
                    }
                    this.fcw.mov(this.AX, left);
                }
                else {
                    this.FreeRegister(this.AX, this.AX, this.DX, right);
                    if (right === this.DX) {
                        let temp = this.CloneVariableInRegisters(right, this.AX, this.DX);
                        if (temp !== null)
                            right = temp;
                        else {
                            right = new Variable(vtx.right.text);
                            right.top = vtx.right;
                        }
                    }
                    this.fcw.mov(this.AX, left);
                }
            }
            else {
                this.FreeRegister(this.AX, this.AX, this.DX, right);
                this.fcw.mov(this.AX, left);
                left = this.AX;
            }
            left = this.AX;
        }
        if (left !== this.AX) {
            throw new Error("Error: left must be AX");
        }
        this.FreeRegister(this.DX, this.AX, this.DX, right);
        let temp = this.CloneVariableInRegisters(left, this.AX, this.DX, right);
        if (temp !== null) {
            temp.top = this.AX.top;
        }
        this.fcw.idiv(right);
        left.top = vtx;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(this.AX);
            this.CheckUseVertex(this.BX);
            this.CheckUseVertex(this.CX);
            this.CheckUseVertex(this.DX);
        }
    }
    IdivOperatorAndVariable(vtx) {
        var _a;
        let varib = this.FindRegisterByTop(vtx.right);
        if (varib === null) {
            varib = new Variable(vtx.right.text);
            varib.top = vtx.right;
            if (this.IsPeriodTop(varib.top)) {
                if (this.GetPeriodTopUseNumber(varib.top, this.settingPeriodLoadOperator)) {
                    let temp = this.DumpRegister(this.registers[0], this.registers[3]);
                    this.fcw.mov(temp, varib);
                    varib = temp;
                }
            }
        }
        let op = (_a = this.FindRegisterByTop(vtx.left)) !== null && _a !== void 0 ? _a : this.FindVariableByTop(vtx.left);
        if (op === null) {
            throw new Error("Error: Unknown variable");
        }
        if (op !== this.AX) {
            if (varib === this.AX) {
                this.fcw.swap(varib, op);
                [varib, op] = [op, varib];
            }
            else {
                this.fcw.swap(op, this.AX);
                op = this.AX;
            }
        }
        this.FreeRegister(this.DX);
        if (this.IsPeriodTop(op.top)) {
            if (this.GetPeriodTopUseNumber(op.top, this.settingPeriodLoadOperator)) {
                let temp = this.DumpRegister(this.registers[0], this.registers[3], varib);
                this.fc.mov(temp, op);
            }
        }
        this.fcw.idiv(varib);
        op.top = vtx;
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(this.AX);
            this.CheckUseVertex(this.BX);
            this.CheckUseVertex(this.CX);
            this.CheckUseVertex(this.DX);
        }
    }
    IdivVariableAndOperator(vtx) {
        var _a;
        let varib = this.FindRegisterByTop(vtx.left);
        let op = (_a = this.FindRegisterByTop(vtx.right)) !== null && _a !== void 0 ? _a : this.FindVariableByTop(vtx.right);
        if (op === null) {
            throw new Error("Error: Unknown variable");
        }
        if (varib === null) {
            varib = new Variable(vtx.left.text);
            varib.top = vtx.left;
            let temp = this.CloneVariableInRegisters(varib, op, this.AX, this.DX);
            if (temp !== null) {
                varib = temp;
            }
        }
        if (varib instanceof Register) {
            if (varib !== this.AX) {
                if (op === this.AX) {
                    this.fcw.swap(varib, op);
                    [varib, op] = [op, varib];
                }
                else {
                    this.fcw.swap(varib, this.AX);
                    varib = this.AX;
                }
            }
        }
        else {
            if (op === this.AX) {
                let temp = this.DumpRegister(this.AX, this.DX);
                this.fcw.mov(temp, op);
                op = temp;
            }
            this.fcw.mov(this.AX, varib);
            varib = this.AX;
        }
        this.CloneVariableInRegisters(varib, this.AX, this.DX, op);
        this.FreeRegister(this.DX);
        this.fcw.idiv(op);
        varib.top = vtx;
        this.ChackUseAllVertex();
    }
    ChackUseAllVertex() {
        if (this.lastIndexTop < this.tops.length - 1) {
            this.CheckUseVertex(this.AX);
            this.CheckUseVertex(this.BX);
            this.CheckUseVertex(this.CX);
            this.CheckUseVertex(this.DX);
        }
    }
    Imul(top) {
        if (top.left.type === typeTop.constant && top.right.type === typeTop.constant) {
            this.ImulConstants(top);
        }
        else if (top.left.type === typeTop.constant && top.right.type === typeTop.operator || top.left.type === typeTop.operator && top.right.type === typeTop.constant) {
            this.ImulConstantAndOperator(top);
        }
        else if (top.left.type === typeTop.operator && top.right.type === typeTop.operator || top.right.type === typeTop.constant && top.left.type === typeTop.variable) {
            this.ImulOperators(top);
        }
        else if (top.left.type === typeTop.constant && top.right.type === typeTop.variable) {
            this.ImulConstantAndVariable(top);
        }
        else if (top.right.type === typeTop.variable && top.left.type === typeTop.variable) {
            this.ImulVariables(top);
        }
        else if (top.right.type === typeTop.variable && top.left.type === typeTop.operator || top.right.type === typeTop.operator && top.left.type === typeTop.variable) {
            this.ImulOperatorAndVariable(top);
        }
        else {
            throw new Error("Error: Unknown operator for idiv-expression");
        }
        this.AX.top = top;
        this.DX.top = null;
        this.ChackUseAllVertex();
    }
    ImulConstants(vtx) {
        this.FreeRegister(this.AX, this.AX, this.DX);
        this.FreeRegister(this.DX, this.AX, this.DX);
        this.fcw.mov(this.AX, vtx.left);
        this.fcw.mov(this.DX, vtx.right);
        this.AX.top = vtx.left;
        this.DX.top = vtx.right;
        this.fcw.imul(this.DX);
    }
    ImulOperators(vtx) {
        let left = this.FindRegisterByTop(vtx.left);
        let right = this.FindRegisterByTop(vtx.right);
        let multiplier = null;
        let op = null;
        if (left === this.AX) {
            op = left;
            this.CloneOperatorInRegisters(op, this.AX, this.DX, right);
        }
        else if (right === this.AX) {
            op = right;
            this.CloneOperatorInRegisters(op, this.AX, this.DX, right);
        }
        if (vtx.left === vtx.right) {
            if (left === null) {
                left = this.FindVariableByTop(vtx.left);
                this.DumpRegister(this.DX, this.BX, this.CX);
                this.AX.top = left.top;
                op = left = this.AX;
            }
            if (op === this.AX) {
                this.CloneOperatorInRegisters(left, this.AX, this.DX);
                this.fcw.imul(this.AX);
                return;
            }
            else if (left === this.DX) {
                this.DumpRegister(this.BX, this.CX, this.DX);
                this.fcw.mov(this.AX, this.DX);
                this.fcw.imul(this.DX);
                return;
            }
            else {
                if (this.GetPeriodTopUseNumber(left.top, this.settingPeriodLoadOperator)) {
                    this.FreeRegister(this.AX, this.AX, this.BX, this.CX, this.DX);
                    this.fcw.mov(this.AX, left);
                    this.fcw.imul(this.AX);
                    return;
                }
                else {
                    this.CloneOperatorInRegisters(left, this.AX, this.BX, this.CX, this.DX);
                    this.fcw.swap(this.AX, left);
                    this.fcw.imul(this.AX);
                    return;
                }
            }
        }
        else {
            if (left === null) {
                left = this.FindVariableByTop(vtx.left);
                let temp = null;
                if (this.GetPeriodTopUseNumber(left.top, this.settingPeriodLoadOperator)) {
                    temp = this.CloneOperatorInRegisters(left, this.DX, right, multiplier, op);
                }
                if (temp !== null) {
                    left = temp;
                }
                else {
                    multiplier = left;
                }
            }
            if (right === null) {
                right = this.FindVariableByTop(vtx.right);
                let temp = null;
                if (this.GetPeriodTopUseNumber(left.top, this.settingPeriodLoadOperator)) {
                    temp = this.CloneOperatorInRegisters(left, this.DX, right, multiplier, op);
                }
                if (temp !== null) {
                    right = temp;
                }
                else if (multiplier === null) {
                    multiplier = right;
                }
                else if (op === null) {
                    this.FreeRegister(this.AX, this.AX, this.DX, multiplier, op);
                    this.fcw.mov(this.AX, right);
                    this.AX.top = right.top;
                    right = this.AX;
                    op = right;
                }
            }
        }
        if (multiplier === null) {
            if (left === this.DX && left !== op) {
                multiplier = left;
                if (op === null) {
                    if (this.IsPeriodTop(right.top) === false) {
                        this.fcw.swap(right, this.AX);
                    }
                    else {
                        this.FreeRegister(this.AX, this.AX, right, this.DX, multiplier, op);
                        this.fcw.mov(this.AX, right);
                    }
                    op = right = this.AX;
                }
            }
            else if (right === this.DX && right !== op) {
                multiplier = right;
                if (op === null) {
                    if (this.IsPeriodTop(left.top) === false) {
                        this.fcw.swap(left, this.AX);
                    }
                    else {
                        this.FreeRegister(this.AX, this.AX, left, this.DX, multiplier, op);
                        this.fcw.mov(this.AX, left);
                    }
                    op = left = this.AX;
                }
            }
            else {
                if (this.IsPeriodTop(left.top) === false && op != left) {
                    this.fcw.swap(left, this.DX);
                    left = this.DX;
                    multiplier = left;
                    if (op === null) {
                        if (this.IsPeriodTop(right.top) === false) {
                            this.fcw.swap(right, this.AX);
                        }
                        else {
                            this.FreeRegister(this.AX, this.AX, right, this.DX, multiplier, op);
                            this.fcw.mov(this.AX, right);
                        }
                        op = right = this.AX;
                    }
                }
                else if (this.IsPeriodTop(right.top) === false && op != right) {
                    this.fcw.swap(right, this.DX);
                    right = this.DX;
                    multiplier = right;
                    if (op === null) {
                        if (this.IsPeriodTop(left.top) === false) {
                            this.fcw.swap(left, this.AX);
                        }
                        else {
                            this.FreeRegister(this.AX, this.AX, left, this.DX, multiplier, op);
                            this.fcw.mov(this.AX, left);
                        }
                        op = left = this.AX;
                    }
                }
                else {
                    if (op === null) {
                        this.FreeRegister(this.AX, this.AX, this.BX, this.CX, this.DX);
                        this.fcw.mov(this.AX, left);
                        op = left = this.AX;
                        multiplier = right;
                    }
                    else if (op === left) {
                        multiplier = right;
                    }
                    else if (op === right) {
                        multiplier = left;
                    }
                    else {
                        throw new Error();
                    }
                }
            }
        }
        else if (op === null) {
            if (this.IsPeriodTop(left.top) === false && multiplier === right) {
                this.fcw.swap(left, this.AX);
                op = left = this.AX;
            }
            else if (this.IsPeriodTop(right.top) === false && multiplier === left) {
                this.fcw.swap(right, this.AX);
                op = right = this.AX;
            }
            else {
                this.FreeRegister(this.AX, this.AX, left, this.DX, multiplier, op);
                this.fcw.mov(this.AX, left);
                this.FreeRegister(this.AX, this.AX, this.BX, this.CX, this.DX, multiplier, op);
                if (multiplier === left) {
                    this.fcw.mov(this.AX, right);
                    op = right = this.AX;
                }
                else if (multiplier === right) {
                    this.fcw.mov(this.AX, left);
                    op = left = this.AX;
                }
            }
        }
        if (multiplier !== this.DX) {
            this.FreeRegister(this.DX, this.AX, multiplier, this.DX, multiplier, op);
        }
        if (op !== this.AX || multiplier === null) {
            throw new Error();
        }
        this.fcw.imul(multiplier);
    }
    CloneOperatorInRegisters(op, ...notUseRegisters) {
        if (this.IsPeriodTop(op.top)) {
            if (this.GetPeriodTopUseNumber(op.top, this.settingPeriodLoadOperator)) {
                let temp = this.DumpRegister(...notUseRegisters);
                this.fcw.mov(temp, op);
                return temp;
            }
            else if (op instanceof Register) {
                let varib = this.CreateTempVariable();
                this.fcw.mov(varib, op);
            }
        }
        return null;
    }
    ;
    ImulConstantAndOperator(vtx) {
        let op;
        let c;
        [op, c] = vtx.left.type === typeTop.operator ? [vtx.left, vtx.right] : [vtx.right, vtx.left];
        let opIVar = this.FindRegisterByTop(op);
        let mnognyk = null;
        let mnogene = null;
        if (opIVar === this.AX) {
            mnogene = opIVar;
            this.FreeRegister(this.DX, this.AX, this.DX);
            this.fcw.mov(this.DX, c);
            mnognyk = this.DX;
        }
        if (opIVar === null) {
            opIVar = this.FindVariableByTop(op);
            let temp = null;
            if (this.GetPeriodTopUseNumber(opIVar.top, this.settingPeriodLoadOperator)) {
                temp = this.CloneOperatorInRegisters(opIVar, this.DX);
            }
            if (temp !== null) {
                opIVar = temp;
            }
            else {
                mnognyk = opIVar;
                this.FreeRegister(this.AX, this.AX, this.DX);
                this.fcw.mov(this.AX, c);
                mnogene = this.AX;
            }
        }
        if (mnognyk === null) {
            if (opIVar === this.DX) {
                mnognyk = opIVar;
            }
            else if (this.IsPeriodTop(op) === false) {
                this.fcw.swap(opIVar, this.DX);
                mnognyk = opIVar = this.DX;
            }
            this.FreeRegister(this.AX, this.AX, this.DX);
            this.fcw.mov(this.AX, c);
            mnogene = this.AX;
        }
        if (mnognyk !== this.DX) {
            this.FreeRegister(this.DX, this.AX, mnognyk, this.DX);
        }
        else {
            this.CloneOperatorInRegisters(opIVar, this.DX, this.AX);
        }
        if (mnogene !== this.AX || mnognyk === null) {
            throw new Error();
        }
        this.fcw.imul(mnognyk);
    }
    ImulConstantAndVariable(vtx) {
        let varib;
        let c;
        [varib, c] = vtx.left.type === typeTop.variable ? [vtx.left, vtx.right] : [vtx.right, vtx.left];
        let varIVar = this.FindRegisterByTop(varib);
        let mnognyk = null;
        let mnogene = null;
        if (varIVar === this.AX) {
            mnogene = varIVar;
            this.FreeRegister(this.DX, this.AX, this.DX);
            this.fcw.mov(this.DX, c);
            mnognyk = this.DX;
        }
        if (varIVar === null) {
            varIVar = Variable.CreateVariableBasedVertex(varib);
            let temp = this.CloneVariableInRegisters(varIVar);
            if (temp !== null) {
                varIVar = temp;
            }
            else {
                mnognyk = varIVar;
                this.FreeRegister(this.AX, this.AX, this.DX);
                this.fcw.mov(this.AX, c);
                mnogene = this.AX;
            }
        }
        if (mnognyk === null) {
            if (varIVar === this.AX) {
                mnogene = varIVar;
                this.FreeRegister(this.DX, this.AX, this.DX);
                this.fcw.mov(this.DX, c);
                mnognyk = this.DX;
            }
            else {
                if (this.IsPeriodTop(varib) === false) {
                    this.fcw.swap(varIVar, this.DX);
                    varIVar = this.DX;
                }
                mnognyk = varIVar;
                this.FreeRegister(this.AX, this.AX, this.DX, mnognyk);
                this.fcw.mov(this.AX, c);
                mnogene = this.AX;
            }
        }
        if (mnognyk !== this.DX) {
            this.FreeRegister(this.DX, this.AX, mnognyk, this.DX);
        }
        else {
            this.CloneOperatorInRegisters(varIVar, this.DX, this.AX);
        }
        if (mnogene !== this.AX || mnognyk === null) {
            throw new Error();
        }
        this.fcw.imul(mnognyk);
    }
    ImulVariables(vtx) {
        let left = this.FindRegisterByTop(vtx.left);
        let right = this.FindRegisterByTop(vtx.right);
        let multiplier = null;
        let op = null;
        if (left === this.AX) {
            op = left;
        }
        else if (right === this.AX) {
            op = right;
        }
        if (vtx.left === vtx.right) {
            if (left === null) {
                left = new Variable(vtx.left.text);
                left.top = vtx.left.top;
                this.DumpRegister(this.DX, this.BX, this.CX);
                this.fcw.mov(this.AX, left);
                this.AX.top = left.top;
                op = left = this.AX;
            }
            if (op === this.AX) {
                let temp = this.CloneVariableInRegisters(op, this.AX, this.DX);
                if (temp !== null) {
                    temp.top = op.top;
                }
                this.fcw.imul(this.AX);
                return;
            }
            else if (left === this.DX) {
                this.DumpRegister(this.BX, this.CX, this.DX);
                this.fcw.mov(this.AX, this.DX);
                this.fcw.imul(this.DX);
                return;
            }
            else {
                if (this.GetPeriodTopUseNumber(left.top, this.settingPeriodLoadVariable)) {
                    this.FreeRegister(this.AX, this.AX, left, this.DX);
                    this.fcw.mov(this.AX, left);
                    this.fcw.imul(this.AX);
                    return;
                }
                else {
                    this.fcw.swap(this.AX, left);
                    this.fcw.imul(this.AX);
                    return;
                }
            }
        }
        else {
            if (left === null) {
                left = new Variable(vtx.left.text);
                left.top = vtx.left.top;
                let temp = null;
                temp = this.CloneVariableInRegisters(left, this.DX, right);
                if (temp !== null) {
                    left = temp;
                }
                else {
                    multiplier = left;
                }
            }
            if (right === null) {
                right = new Variable(vtx.right.text);
                right.top = vtx.right.top;
                let temp = null;
                temp = this.CloneVariableInRegisters(right, this.DX, left);
                if (temp !== null) {
                    right = temp;
                }
                else if (multiplier === null) {
                    multiplier = right;
                }
                else if (op === null) {
                    this.FreeRegister(this.AX, this.AX, this.DX);
                    this.fcw.mov(this.AX, right);
                    this.AX.top = right.top;
                    right = this.AX;
                    op = right;
                }
            }
        }
        if (multiplier === null) {
            if (left === this.DX && left !== op) {
                multiplier = left;
                if (op === null) {
                    if (this.IsPeriodTop(right.top) === false) {
                        this.fcw.swap(right, this.AX);
                    }
                    else {
                        this.FreeRegister(this.AX, this.AX, right, this.DX);
                        this.fcw.mov(this.AX, right);
                    }
                    op = right = this.AX;
                }
            }
            else if (right === this.DX && right !== op) {
                multiplier = right;
                if (op === null) {
                    if (this.IsPeriodTop(left.top) === false) {
                        this.fcw.swap(left, this.AX);
                    }
                    else {
                        this.FreeRegister(this.AX, this.AX, left, this.DX);
                        this.fcw.mov(this.AX, left);
                    }
                    op = left = this.AX;
                }
            }
            else {
                if (this.IsPeriodTop(left.top) === false && op != left) {
                    this.fcw.swap(left, this.DX);
                    left = this.DX;
                    multiplier = left;
                    if (op === null) {
                        if (this.IsPeriodTop(right.top) === false) {
                            this.fcw.swap(right, this.AX);
                        }
                        else {
                            this.FreeRegister(this.AX, this.AX, right, this.DX);
                            this.fcw.mov(this.AX, right);
                        }
                        op = right = this.AX;
                    }
                }
                else if (this.IsPeriodTop(right.top) === false && op != right) {
                    this.fcw.swap(right, this.DX);
                    right = this.DX;
                    multiplier = right;
                    if (op === null) {
                        if (this.IsPeriodTop(left.top) === false) {
                            this.fcw.swap(left, this.AX);
                        }
                        else {
                            this.FreeRegister(this.AX, this.AX, left, this.DX);
                            this.fcw.mov(this.AX, left);
                        }
                        op = left = this.AX;
                    }
                }
                else {
                    if (op === null) {
                        this.FreeRegister(this.AX, this.AX, this.BX, this.CX, this.DX);
                        this.fcw.mov(this.AX, left);
                        op = left = this.AX;
                        multiplier = right;
                    }
                    else if (op === left) {
                        multiplier = right;
                    }
                    else if (op === right) {
                        multiplier = left;
                    }
                    else {
                        throw new Error();
                    }
                }
            }
        }
        else if (op === null) {
            if (this.IsPeriodTop(left.top) === false && multiplier === right) {
                this.fcw.swap(left, this.AX);
                op = left = this.AX;
            }
            else if (this.IsPeriodTop(right.top) === false && multiplier === left) {
                this.fcw.swap(right, this.AX);
                op = right = this.AX;
            }
            else {
                this.FreeRegister(this.AX, this.AX, left, this.DX);
                this.fcw.mov(this.AX, left);
                this.FreeRegister(this.AX, this.AX, this.BX, this.CX, this.DX);
                if (multiplier === left) {
                    this.fcw.mov(this.AX, right);
                    op = right = this.AX;
                }
                else if (multiplier === right) {
                    this.fcw.mov(this.AX, left);
                    op = left = this.AX;
                }
            }
        }
        if (multiplier !== this.DX) {
            this.FreeRegister(this.DX, this.AX, multiplier, this.DX);
        }
        if (op !== this.AX || multiplier === null) {
            throw new Error();
        }
        this.fcw.imul(multiplier);
    }
    ImulOperatorAndVariable(vtx) {
        let varib;
        let op;
        [varib, op] = vtx.left.type === typeTop.variable ? [vtx.left, vtx.right] : [vtx.right, vtx.left];
        let varibIVar = this.FindRegisterByTop(varib);
        let opIVar = this.FindRegisterByTop(op);
        let mnognyk = null;
        let mnogene = null;
        if (varibIVar === this.AX) {
            mnogene = varibIVar;
        }
        else if (opIVar === this.AX) {
            mnogene = opIVar;
        }
        if (varibIVar === null) {
            varibIVar = Variable.CreateVariableBasedVertex(varib);
            let temp = null;
            temp = this.CloneVariableInRegisters(varibIVar, this.DX, opIVar);
            if (temp !== null) {
                varibIVar = temp;
            }
            else {
                mnognyk = varibIVar;
            }
        }
        if (opIVar === null) {
            opIVar = this.FindVariableByTop(op);
            let temp = null;
            if (this.GetPeriodTopUseNumber(op, this.settingPeriodLoadOperator)) {
                temp = this.CloneOperatorInRegisters(opIVar, this.DX, varibIVar);
            }
            if (temp !== null) {
                opIVar = temp;
            }
            else if (mnognyk === null) {
                mnognyk = opIVar;
            }
            else if (mnogene === null) {
                this.FreeRegister(this.AX, this.AX, this.DX);
                this.fcw.mov(this.AX, opIVar);
                this.AX.top = opIVar.top;
                opIVar = this.AX;
                mnogene = opIVar;
            }
        }
        if (mnognyk === null) {
            if (varibIVar === this.DX && varibIVar !== mnogene) {
                mnognyk = varibIVar;
                if (mnogene === null) {
                    if (this.IsPeriodTop(opIVar.top) === false) {
                        this.fcw.swap(opIVar, this.AX);
                    }
                    else {
                        this.FreeRegister(this.AX, this.AX, opIVar, this.DX);
                        this.fcw.mov(this.AX, opIVar);
                    }
                    mnogene = opIVar = this.AX;
                }
            }
            else if (opIVar === this.DX && opIVar !== mnogene) {
                mnognyk = opIVar;
                if (mnogene === null) {
                    if (this.IsPeriodTop(varibIVar.top) === false) {
                        this.fcw.swap(varibIVar, this.AX);
                    }
                    else {
                        this.FreeRegister(this.AX, this.AX, varibIVar, this.DX);
                        this.fcw.mov(this.AX, varibIVar);
                    }
                    mnogene = varibIVar = this.AX;
                }
            }
            else {
                if (this.IsPeriodTop(varibIVar.top) === false && mnogene != varibIVar) {
                    this.fcw.swap(varibIVar, this.DX);
                    varibIVar = this.DX;
                    mnognyk = varibIVar;
                    if (mnogene === null) {
                        if (this.IsPeriodTop(opIVar.top) === false) {
                            this.fcw.swap(opIVar, this.AX);
                        }
                        else {
                            this.FreeRegister(this.AX, this.AX, opIVar, this.DX);
                            this.fcw.mov(this.AX, opIVar);
                        }
                        mnogene = opIVar = this.AX;
                    }
                }
                else if (this.IsPeriodTop(opIVar.top) === false && mnogene != opIVar) {
                    this.fcw.swap(opIVar, this.DX);
                    opIVar = this.DX;
                    mnognyk = opIVar;
                    if (mnogene === null) {
                        if (this.IsPeriodTop(varibIVar.top) === false) {
                            this.fcw.swap(varibIVar, this.AX);
                        }
                        else {
                            this.FreeRegister(this.AX, this.AX, varibIVar, this.DX);
                            this.fcw.mov(this.AX, varibIVar);
                        }
                        mnogene = varibIVar = this.AX;
                    }
                }
                else {
                    if (mnogene === null) {
                        this.FreeRegister(this.AX, this.AX, this.BX, this.CX, this.DX);
                        this.fcw.mov(this.AX, varibIVar);
                        mnogene = varibIVar = this.AX;
                        mnognyk = opIVar;
                    }
                    else if (mnogene === varibIVar) {
                        mnognyk = opIVar;
                    }
                    else if (mnogene === opIVar) {
                        mnognyk = varibIVar;
                    }
                    else {
                        throw new Error();
                    }
                }
            }
        }
        else if (mnogene === null) {
            if (this.IsPeriodTop(varibIVar.top) === false && mnognyk === opIVar) {
                this.fcw.swap(varibIVar, this.AX);
                mnogene = varibIVar = this.AX;
            }
            else if (this.IsPeriodTop(opIVar.top) === false && mnognyk === varibIVar) {
                this.fcw.swap(opIVar, this.AX);
                mnogene = opIVar = this.AX;
            }
            else {
                this.FreeRegister(this.AX, this.AX, varibIVar, this.DX);
                this.fcw.mov(this.AX, varibIVar);
                this.FreeRegister(this.AX, this.AX, this.BX, this.CX, this.DX);
                if (mnognyk === varibIVar) {
                    this.fcw.mov(this.AX, opIVar);
                    mnogene = opIVar = this.AX;
                }
                else if (mnognyk === opIVar) {
                    this.fcw.mov(this.AX, varibIVar);
                    mnogene = varibIVar = this.AX;
                }
            }
        }
        if (mnognyk !== this.DX) {
            this.FreeRegister(this.DX, this.AX, mnognyk);
        }
        if (mnogene !== this.AX || mnognyk === null) {
            throw new Error();
        }
        this.fcw.imul(mnognyk);
    }
    CloneVariableInRegisters(varib, ...notUseRegisters) {
        if (this.IsPeriodTop(varib.top)) {
            if (this.GetPeriodTopUseNumber(varib.top, this.settingPeriodLoadVariable)) {
                let temp = this.DumpRegister(...notUseRegisters);
                this.fcw.mov(temp, varib);
                return temp;
            }
        }
        return null;
    }
    CheckUseVertex(ivar) {
        if (this.FindTopsByTop(ivar.top) === false) {
            ivar.top = null;
            ivar.isAvailable = true;
        }
    }
    DumpRegister(...notUseRegisters) {
        for (let i = 0; i < this.registers.length; i++) {
            if (notUseRegisters.indexOf(this.registers[i]) !== -1)
                continue;
            if (this.registers[i].isAvailable) {
                return this.registers[i];
            }
        }
        let binaryPeriod = new Array(this.registers.length);
        for (let j = 0; j < this.registers.length; j++) {
            binaryPeriod[j] = notUseRegisters.indexOf(this.registers[j]) !== -1 ? 0 : this.GetPeriodTop(this.registers[j].top);
        }
        let periodRes = Math.max(...binaryPeriod);
        let res = this.registers[binaryPeriod.indexOf(periodRes)];
        if (res.top.type === typeTop.variable) {
            return res;
        }
        let varib = this.CreateTempVariable();
        this.fcw.mov(varib, res);
        return res;
    }
    MoveRegisterToVariable(reg) {
        if (reg.isAvailable || reg.top.type === typeTop.variable) {
            reg.top = null;
            return false;
        }
        let varib = this.CreateTempVariable();
        this.fcw.mov(varib, reg);
        reg.top = null;
        return true;
    }
    FreeRegister(reg, ...useNotRegisters) {
        if (reg.isAvailable || reg.top.type === typeTop.variable) {
            reg.top = null;
            return false;
        }
        for (let i = 0; i < this.registers.length; i++) {
            if (useNotRegisters.some(e => e === this.registers[i]) === false && reg.top === this.registers[i].top) {
                reg.top = null;
                return true;
            }
        }
        let repl = null;
        for (let i = 0; i < this.registers.length; i++) {
            if (useNotRegisters.some(e => e === this.registers[i]) === false && (this.registers[i].isAvailable || this.registers[i].top.type === typeTop.variable)) {
                repl = this.registers[i];
                break;
            }
        }
        if (repl !== null) {
            this.fcw.mov(repl, reg);
        }
        else {
            let varib = this.CreateTempVariable();
            this.fcw.mov(varib, reg);
        }
        reg.top = null;
        return true;
    }
    FindRegisterByTop(top) {
        for (let i = 0; i < this.registers.length; i++) {
            if (this.registers[i].top === top)
                return this.registers[i];
        }
        return null;
    }
    FindVariableByTop(top) {
        for (let i = 0; i < this.variables.length; i++) {
            if (this.variables[i].top === top) {
                return this.variables[i];
            }
        }
        return null;
    }
    CreateTempVariable() {
        for (let i = 0; i < this.variables.length; i++) {
            if (this.variables[i].isAvailable) {
                return this.variables[i];
            }
            else if (this.IsPeriodTop(this.variables[i].top) === false) {
                return this.variables[i];
            }
        }
        const add = new Variable(`tmp${this.variables.length}`);
        this.variables.push(add);
        return add;
    }
    FindTopsByTop(vtx) {
        for (let i = this.lastIndexTop + 1; i < this.tops.length; i++) {
            if (this.tops[i].Avaible(vtx)) {
                return true;
            }
        }
        return false;
    }
    GetPeriodTop(vtx) {
        for (let i = this.lastIndexTop + 1; i < this.tops.length; i++) {
            if (this.tops[i].Avaible(vtx)) {
                return i - this.lastIndexTop;
            }
        }
        return Number.POSITIVE_INFINITY;
    }
    GetPeriodTopUseNumber(vtx, period) {
        let i = this.lastIndexTop + 1;
        for (; i < this.tops.length; i++) {
            if (i > this.lastIndexTop + period)
                return false;
            if (this.tops[i].Avaible(vtx)) {
                return true;
            }
        }
        return false;
    }
    IsPeriodTop(vtx) {
        for (let i = this.lastIndexTop + 1; i < this.tops.length; i++) {
            if (this.tops[i].Avaible(vtx)) {
                return true;
            }
        }
        return false;
    }
}
