class FASMCompilator {
  public fc: FASMCodeWritter = new FASMCodeWritter();

  public fcw: FASMCodeWritterEditor = new FASMCodeWritterEditor(this.fc);

  public lastIndexTop: number = 0;

  public settingPeriodLoadVariable: number = 10;
  public settingPeriodLoadOperator: number = 3;
  public settingUseMinPeriod: boolean = false;

  public registers: Register[] = new Array<Register>(
    new Register("AX"),
    new Register("BX"),
    new Register("CX"),
    new Register("DX")
  );

  private readonly AX: Register = this.registers[0];
  private readonly BX: Register = this.registers[1];
  private readonly CX: Register = this.registers[2];
  private readonly DX: Register = this.registers[3];

  public variables: Variable[] = new Array<Variable>();

  constructor(public tops: Vertex[], public nameVar: Vertex[]) {
    this.Init();
  }

  private Init() {
    this.registers[0].isMultiple = true;
    this.registers[0].isDivided = true;
    this.registers[3].isStable = false;
  }


  public Compilation(): string {
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

  public Step() {
    this.fc.code += "; " + (this.lastIndexTop + 1) + "\n";
    //this.fc.code += "; " + (this.tops[this.lastIndexTop].GetFormulaString()) + "\n";
    let i = this.lastIndexTop;
    if (this.tops[i].type === typeTop.operator) {
      if (this.tops[i].left !== null && this.tops[i].right !== null) {
        if (this.tops[i].text === "+") {
          this.Add(this.tops[i]);
        } else if (this.tops[i].text === "-") {
          this.Sub(this.tops[i]);
        } else if (this.tops[i].text === "/") {
          this.Idiv(this.tops[i]);
        } else if (this.tops[i].text === "*") {
          this.Imul(this.tops[i]);
        }
      }
    }
    this.lastIndexTop++;
    // this.fc.code += `; `;
    // for(let i = 0; i < this.registers.length; i++){
    //   let reg = this.registers[i];
    //   let textTop: string = reg.top === null ? "null" : reg.top.type === typeTop.constant || reg.top.type === typeTop.variable ? reg.top.text : "[" + (this.findIndexVertex(reg.top) + 1) + "]";

    //   this.fc.code += `${reg.name} = ${textTop} | `;
    // }
    // this.fc.code += "\n\n";
  }


  private findIndexVertex(vtx: Vertex): number{
    for(let i = 0; i < this.tops.length; i++){
        if(this.tops[i] === vtx)
            return i;
    }
    return -1;
}


  private Add(top: Vertex): void {
    if (top.left.type === typeTop.constant && top.right.type === typeTop.constant) {
      this.AddConstants(top);
    } else if (top.left.type === typeTop.operator && top.right.type === typeTop.constant || top.left.type === typeTop.constant && top.right.type === typeTop.operator) {
      this.AddOperatorAndConstant(top);
    } else if (top.left.type === typeTop.operator && top.right.type === typeTop.operator) {
      this.AddOperators(top);
    } else if ((top.left.type === typeTop.constant && top.right.type === typeTop.variable) ||
      (top.right.type === typeTop.constant && top.left.type === typeTop.variable)) {
      this.AddVariableAndConstant(top);
    } else if (top.right.type === typeTop.variable && top.left.type === typeTop.variable) {
      this.AddVariables(top);
    } else if (top.right.type === typeTop.variable && top.left.type === typeTop.operator ||
      top.right.type === typeTop.operator && top.left.type === typeTop.variable) {
      this.AddOperatorAndVariable(top);
    } else {
      throw new Error("Error: Unknown operator");
    }
  }

  private AddConstants(top: Vertex): void {
    let reg: Register = this.DumpRegister();

    //this.fc.mov(reg, top.left.text);
    this.fcw.add(reg, top.left, top.right);

    reg.top = top;
  }

  private AddOperators(top: Vertex): void {
    let left: IVariable = this.FindRegisterByTop(top.left);
    let right: IVariable = this.FindRegisterByTop(top.right);
    let regRes: Register;

    let isLeftUse: boolean = this.GetPeriodTopUseNumber(top.left, this.settingPeriodLoadOperator);
    let isRightUse: boolean = this.GetPeriodTopUseNumber(top.right, this.settingPeriodLoadOperator);


    if (left !== null && right !== null) {
      if (this.SomeAvaibleRegister() && this.IsPeriodTop(top.left) && this.IsPeriodTop(top.right)) {
        regRes = this.DumpRegister(left as Register, right as Register);
      } else {
        if (isLeftUse == false) {
          regRes = left as Register;
          if (this.GetPeriodTop(regRes.top) !== Number.POSITIVE_INFINITY) {
            let temp = this.CreateTempVariable();
            this.fcw.mov(temp, regRes.top);
          }
        } else if (isRightUse == false) {
          regRes = right as Register;
          if (this.GetPeriodTop(regRes.top) !== Number.POSITIVE_INFINITY) {
            let temp = this.CreateTempVariable();
            this.fcw.mov(temp, regRes.top);
          }
        } else {
          regRes = this.DumpRegister(left as Register, right as Register);
        }
      }

    } else {
      if (left === null) {
        left = this.FindVariableByTop(top.left);
        if (left === null)
          throw new Error("Error: Cannot find variable");

        if (isLeftUse) {
          let temp: Register = this.DumpRegister(right as Register);
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
          let temp: Register = this.DumpRegister(left as Register);
          this.fcw.mov(temp, right);
          temp.top = right.top;
          right = temp;
        }
      }
      if (left instanceof Register && isLeftUse === false) {
        regRes = left;
      } else if (right instanceof Register && isRightUse === false) {
        regRes = right;
      } else {
        regRes = this.DumpRegister(left as Register, right as Register);
      }
    }

    this.fcw.add(regRes, left, right);
    regRes.top = top;

    if (this.lastIndexTop < this.tops.length - 1) {
      this.CheckUseVertex(left);
      this.CheckUseVertex(right);
    }


  }

  private AddOperatorAndConstant(top: Vertex): void {
    let op: Vertex;
    let c: Vertex;
    [op, c] = top.left.type === typeTop.operator ? [top.left, top.right] : [top.right, top.left];


    let left: IVariable = this.FindRegisterByTop(op);
    let regRes: Register;

    let isLeftUse: boolean = this.GetPeriodTopUseNumber(op, this.settingPeriodLoadOperator);


    if (left !== null) {
      if (isLeftUse == false) {
        regRes = left as Register;
        if (this.GetPeriodTop(regRes.top) !== Number.POSITIVE_INFINITY) {
          let temp = this.CreateTempVariable();
          this.fcw.mov(temp, regRes.top);
        }
      } else {
        regRes = this.DumpRegister(left as Register);
      }
    } else {
      left = this.FindVariableByTop(op);
      if (left === null)
        throw new Error("Error: Cannot find operator");

      if (isLeftUse) {
        let temp: Register = this.DumpRegister();
        this.fcw.mov(temp, left);
        temp.top = left.top;
        left = temp;
      }
    }
    if (regRes === null) {
      regRes = this.DumpRegister(left as Register);
    }


    this.fcw.add(regRes, left, c);
    regRes.top = top;

    if (this.lastIndexTop < this.tops.length - 1) {
      this.CheckUseVertex(left);
    }
  }

  private AddVariableAndConstant(top: Vertex): void {
    let varib: Vertex;
    let c: Vertex;

    let pos: boolean = top.left.type === typeTop.variable;
    [varib, c] = top.left.type === typeTop.variable ? [top.left, top.right] : [top.right, top.left];


    let left: IVariable = this.FindRegisterByTop(varib);
    let regRes: Register = null;

    let isLeftUse: boolean = this.GetPeriodTopUseNumber(varib, this.settingPeriodLoadOperator);


    if (left !== null) {
      if (isLeftUse == false) {
        regRes = left as Register;
      }
    } else {
      if (isLeftUse) {
        let temp: Register = this.DumpRegister();
        this.fcw.mov(temp, varib);
        temp.top = varib.top;
        left = temp;
      } else {
        left = new Variable(varib.text);
        left.top = varib;
      }
    }
    if (regRes == null) {
      regRes = this.DumpRegister(left as Register);
    }

    regRes.top = top;

    if (pos) {
      this.fcw.add(regRes, left, c);
    } else {
      this.fcw.add(regRes, c, left);
    }



    if (this.lastIndexTop < this.tops.length - 1) {
      this.CheckUseVertex(left);
    }
  }

  public SomeAvaibleRegister(): boolean {
    for (let i = 0; i < this.registers.length; i++) {
      if (this.registers[i].isAvailable) {
        return true;
      }
    }
    return false;
  }

  public AddVariables(vtx: Vertex): void {
    let left: IVertex = this.FindRegisterByTop(vtx.left);
    let right: IVertex = this.FindRegisterByTop(vtx.right);
    let regRes: Register;

    let isLeftUse: boolean = this.GetPeriodTopUseNumber(vtx.left, this.settingPeriodLoadVariable);
    let isRightUse: boolean = this.GetPeriodTopUseNumber(vtx.right, this.settingPeriodLoadVariable);


    if (left !== null && right !== null) {
      if (isLeftUse == false) {
        regRes = left as Register;
      } else if (isRightUse == false) {
        regRes = right as Register;
      } else {
        regRes = this.DumpRegister(left as Register, right as Register);
      }
    } else {
      if (vtx.left === vtx.right) {
        if (isLeftUse) {
          let temp: Register = this.DumpRegister(right as Register);
          this.fcw.mov(temp, vtx.left);
          temp.top = vtx.left.top;
          left = temp;
          right = temp;
        } else {
          left = vtx.left;
          right = vtx.right;
        }
      } else {
        if (left === null) {
          if (isLeftUse) {
            let temp: Register = this.DumpRegister(right as Register);
            this.fcw.mov(temp, vtx.left);
            temp.top = vtx.left.top;
            left = temp;
          } else {
            left = vtx.left;
          }
        }
        if (right === null) {
          if (isRightUse) {
            let temp: Register = this.DumpRegister(left as Register);
            this.fcw.mov(temp, vtx.right);
            temp.top = vtx.right.top;
            right = temp;
          } else {
            right = vtx.right;
          }
        }
      }

      if (left instanceof Register && isLeftUse === false) {
        regRes = left;
      } else if (right instanceof Register && isRightUse === false) {
        regRes = right;
      } else {
        regRes = this.DumpRegister(left as Register, right as Register);
      }
    }

    this.fcw.add(regRes, left, right);
    regRes.top = vtx;

    if (this.lastIndexTop < this.tops.length - 1) {
      this.CheckUseVertex(left as IVariable);
      this.CheckUseVertex(right as IVariable);
    }
  }

  private AddOperatorAndVariable(vtx: Vertex): void {
    let varib: Vertex;
    let op: Vertex;
    let pos: boolean = vtx.left.type === typeTop.variable;
    [varib, op] = pos ? [vtx.left, vtx.right] : [vtx.right, vtx.left];

    let left: IVariable = this.FindRegisterByTop(varib);
    let right: IVariable = this.FindRegisterByTop(op);
    let regRes: Register;

    let isLeftUse: boolean = this.GetPeriodTopUseNumber(varib, this.settingPeriodLoadVariable);
    let isRightUse: boolean = this.GetPeriodTopUseNumber(op, this.settingPeriodLoadOperator);

    if (left !== null && right !== null) {
      if (this.SomeAvaibleRegister() && this.IsPeriodTop(vtx.left) && this.IsPeriodTop(vtx.right) === false) {
        if (isLeftUse == false) {
          regRes = left as Register;
        } else if (isRightUse == false) {
          regRes = right as Register;
          if (this.GetPeriodTop(regRes.top) !== Number.POSITIVE_INFINITY) {
            let temp = this.CreateTempVariable();
            this.fcw.mov(temp, regRes.top);
          }
        }
      }
    } else {
      if (left === null) {
        if (isLeftUse) {
          let temp: Register = this.DumpRegister(right as Register);
          this.fcw.mov(temp, varib);
          temp.top = varib.top;
          left = temp;
        } else {
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
          let temp: Register = this.DumpRegister(left as Register);
          this.fcw.mov(temp, right);
          temp.top = right.top;
          right = temp;
        }
      }
    }
    if (this.SomeAvaibleRegister() && this.IsPeriodTop(vtx.left) && this.IsPeriodTop(vtx.right)) {
      regRes = this.DumpRegister(left as Register, right as Register);
    } else {
      if (pos == false) {
        if (right instanceof Register && isRightUse == false) {
          regRes = right as Register;
        } else if (left instanceof Register && isLeftUse == false) {
          regRes = left as Register;
        } else {
          regRes = this.DumpRegister(left as Register, right as Register);
        }
      } else {
        if (left instanceof Register && isLeftUse == false) {
          regRes = left as Register;
        } else if (right instanceof Register && isRightUse == false) {
          regRes = right as Register;
        } else {
          regRes = this.DumpRegister(left as Register, right as Register);
        }
      }

    }


    if (pos === false) {
      this.fcw.add(regRes, left, right);
    } else {
      this.fcw.add(regRes, right, left);
    }


    regRes.top = vtx;

    if (this.lastIndexTop < this.tops.length - 1) {
      this.CheckUseVertex(left);
      this.CheckUseVertex(right);
    }


  }

  private Sub(top: Vertex): void {
    if (top.left.type === typeTop.constant && top.right.type === typeTop.constant) {
      this.SubConstants(top);
    } else if (top.left.type === typeTop.operator && top.right.type === typeTop.constant || top.left.type === typeTop.constant && top.right.type === typeTop.operator) {
      this.SubOperatorAndConstant(top);
    } else if (top.left.type === typeTop.operator && top.right.type === typeTop.operator) {
      this.SubOperators(top);
    } else if ((top.left.type === typeTop.constant && top.right.type === typeTop.variable) ||
      (top.right.type === typeTop.constant && top.left.type === typeTop.variable)) {
      this.SubVariableAndConstant(top);
    } else if (top.right.type === typeTop.variable && top.left.type === typeTop.variable) {
      this.SubVariables(top);
    } else if (top.right.type === typeTop.variable && top.left.type === typeTop.operator ||
      top.right.type === typeTop.operator && top.left.type === typeTop.variable) {
      this.SubOperatorAndVariable(top);
    } else {
      throw new Error("Error: Unknown operator for sub-expression");
    }
  }

  private SubConstants(top: Vertex): void {
    let reg: Register = this.DumpRegister();

    this.fcw.sub(reg, top.left, top.right);

    reg.top = top;
  }

  private SubOperators(top: Vertex): void {
    let left: IVariable = this.FindRegisterByTop(top.left);
    let right: IVariable = this.FindRegisterByTop(top.right);
    let regRes: Register;

    let isLeftUse: boolean = this.GetPeriodTopUseNumber(top.left, this.settingPeriodLoadOperator);
    let isRightUse: boolean = this.GetPeriodTopUseNumber(top.right, this.settingPeriodLoadOperator);


    if (left !== null && right !== null) {
      if (this.SomeAvaibleRegister() && this.IsPeriodTop(top.left) && this.IsPeriodTop(top.right)) {
        regRes = this.DumpRegister(left as Register, right as Register);
      } else {
        if (isLeftUse == false) {
          regRes = left as Register;
          if (this.GetPeriodTop(regRes.top) !== Number.POSITIVE_INFINITY) {
            let temp = this.CreateTempVariable();
            this.fcw.mov(temp, regRes.top);
          }
        } else {
          regRes = this.DumpRegister(left as Register, right as Register);
        }
      }
    } else {
      if (left === null) {
        left = this.FindVariableByTop(top.left);
        if (left === null)
          throw new Error("Error: Cannot find variable");

        if (isLeftUse) {
          let temp: Register = this.DumpRegister(right as Register);
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
          let temp: Register = this.DumpRegister(left as Register);
          this.fcw.mov(temp, right);
          temp.top = right.top;
          right = temp;
        }
      }
      if (left instanceof Register && isLeftUse === false) {
        regRes = left;
      } else {
        regRes = this.DumpRegister(left as Register, right as Register);
      }
    }

    this.fcw.sub(regRes, left, right);
    regRes.top = top;

    if (this.lastIndexTop < this.tops.length - 1) {
      this.CheckUseVertex(left);
      this.CheckUseVertex(right);
    }
  }

  private SubOperatorAndConstant(top: Vertex): void {
    let op: Vertex;
    let c: Vertex;

    let pos: boolean = top.left.type === typeTop.operator;
    [op, c] = pos ? [top.left, top.right] : [top.right, top.left];

    let left: IVariable = this.FindRegisterByTop(op);
    let regRes: Register = null;

    let isLeftUse: boolean = this.GetPeriodTopUseNumber(op, this.settingPeriodLoadOperator);

    if (left !== null) {
      if (isLeftUse == false && pos) {
        regRes = left as Register;
        if (this.GetPeriodTop(regRes.top) !== Number.POSITIVE_INFINITY) {
          let temp = this.CreateTempVariable();
          this.fcw.mov(temp, regRes.top);
        }
      }
    } else {
      left = this.FindVariableByTop(op);
      if (left === null)
        throw new Error("Error: Cannot find operator");

      if (isLeftUse) {
        let temp: Register = this.DumpRegister();
        this.fcw.mov(temp, left);
        temp.top = left.top;
        left = temp;
      }
    }


    if (regRes === null) {
      regRes = this.DumpRegister(left as Register);
    }

    this.fcw.sub(regRes, left, c);

    regRes.top = top;

    if (this.lastIndexTop < this.tops.length - 1) {
      this.CheckUseVertex(left);
    }
  }

  private SubVariableAndConstant(top: Vertex): void {
    let varib: Vertex;
    let c: Vertex;

    let pos: boolean = top.left.type === typeTop.variable;
    [varib, c] = pos ? [top.left, top.right] : [top.right, top.left];

    let left: IVariable = this.FindRegisterByTop(varib);
    let regRes: Register = null;

    let isLeftUse: boolean = this.GetPeriodTopUseNumber(varib, this.settingPeriodLoadVariable);

    if (left !== null) {
      if (isLeftUse == false && pos) {
        regRes = left as Register;
      }
    } else {
      if (isLeftUse) {
        let temp: Register = this.DumpRegister();
        this.fcw.mov(temp, varib);
        temp.top = varib.top;
        left = temp;
      } else {
        left = new Variable(varib.text);
        left.top = varib;
      }
    }

    if (regRes === null) {
      regRes = this.DumpRegister(left as Register);
    }

    this.fcw.sub(regRes, left, c);

    regRes.top = top;

    if (this.lastIndexTop < this.tops.length - 1) {
      this.CheckUseVertex(left);
    }
  }

  public SubVariables(vtx: Vertex): void {
    let left: IVertex = this.FindRegisterByTop(vtx.left);
    let right: IVertex = this.FindRegisterByTop(vtx.right);
    let regRes: Register;

    let isLeftUse: boolean = this.GetPeriodTopUseNumber(vtx.left, this.settingPeriodLoadVariable);
    let isRightUse: boolean = this.GetPeriodTopUseNumber(vtx.right, this.settingPeriodLoadVariable);


    if (left !== null && right !== null) {
      if (isLeftUse == false) {
        regRes = left as Register;
      }
    } else {
      if (vtx.left === vtx.right) {
        if (isLeftUse) {
          let temp: Register = this.DumpRegister(right as Register);
          this.fcw.mov(temp, vtx.left);
          temp.top = vtx.left.top;
          left = temp;
          right = temp;
        } else {
          left = vtx.left;
          right = vtx.right;
        }
      } else {
        if (left === null) {
          if (isLeftUse) {
            let temp: Register = this.DumpRegister(right as Register);
            this.fcw.mov(temp, vtx.left);
            temp.top = vtx.left.top;
            left = temp;
          } else {
            left = vtx.left;
          }
        }
        if (right === null) {
          if (isRightUse) {
            let temp: Register = this.DumpRegister(left as Register);
            this.fcw.mov(temp, vtx.right);
            temp.top = vtx.right.top;
            right = temp;
          } else {
            right = vtx.right;
          }
        }
      }

      if (left instanceof Register && isLeftUse === false) {
        regRes = left;
      } else if (right instanceof Register && isRightUse === false) {
        regRes = right;
      } else {
        regRes = this.DumpRegister(left as Register, right as Register);
      }
    }

    this.fcw.sub(regRes, left, right);
    regRes.top = vtx;

    if (this.lastIndexTop < this.tops.length - 1) {
      this.CheckUseVertex(left as IVariable);
      this.CheckUseVertex(right as IVariable);
    }
  }

  private SubOperatorAndVariable(vtx: Vertex): void {
    let varib: Vertex;
    let op: Vertex;
    let pos: boolean = vtx.left.type === typeTop.variable;
    [varib, op] = pos ? [vtx.left, vtx.right] : [vtx.right, vtx.left];

    let left: IVariable = this.FindRegisterByTop(varib);
    let right: IVariable = this.FindRegisterByTop(op);
    let regRes: Register;

    let isLeftUse: boolean = this.GetPeriodTopUseNumber(varib, this.settingPeriodLoadVariable);
    let isRightUse: boolean = this.GetPeriodTopUseNumber(op, this.settingPeriodLoadOperator);

    if (left !== null && right !== null) {
      if (this.SomeAvaibleRegister() && this.IsPeriodTop(vtx.left) && this.IsPeriodTop(vtx.right) === false) {
        if (isLeftUse == false) {
          regRes = left as Register;
        }
      }
    } else {
      if (left === null) {
        if (isLeftUse) {
          let temp: Register = this.DumpRegister(right as Register);
          this.fcw.mov(temp, varib);
          temp.top = varib.top;
          left = temp;
        } else {
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
          let temp: Register = this.DumpRegister(left as Register);
          this.fcw.mov(temp, right);
          temp.top = right.top;
          right = temp;
        }
      }
    }
    if (this.SomeAvaibleRegister() && this.IsPeriodTop(vtx.left) && this.IsPeriodTop(vtx.right)) {
      regRes = this.DumpRegister(left as Register, right as Register);
    } else {
      if (pos == false) {
        if (right instanceof Register && isRightUse == false) {
          regRes = right as Register;
        } else {
          regRes = this.DumpRegister(left as Register, right as Register);
        }
      } else {
        if (left instanceof Register && isLeftUse == false) {
          regRes = left as Register;
        } else {
          regRes = this.DumpRegister(left as Register, right as Register);
        }
      }

    }

    if(pos === false){
      this.fcw.sub(regRes, right, left);
    }else{
      this.fcw.sub(regRes, left, right);
    }
    


    regRes.top = vtx;

    if (this.lastIndexTop < this.tops.length - 1) {
      this.CheckUseVertex(left);
      this.CheckUseVertex(right);
    }


  }

  private Idiv(top: Vertex): void {
    if (top.left.type === typeTop.constant && top.right.type === typeTop.constant) {
      this.IdivConstants(top);
    } else if (top.left.type === typeTop.operator && top.right.type === typeTop.constant) {
      this.IdivOperatorAndConstant(top);
    } else if (top.left.type === typeTop.constant && top.right.type === typeTop.operator) {
      this.IdivConstantAndOperator(top);
    } else if (top.left.type === typeTop.operator && top.right.type === typeTop.operator) {
      this.IdivOperators(top);
    } else if (top.right.type === typeTop.constant && top.left.type === typeTop.variable) {
      this.IdivVariableAndConstant(top);
    } else if (top.left.type === typeTop.constant && top.right.type === typeTop.variable) {
      this.IdivConstantAndVariable(top);
    } else if (top.right.type === typeTop.variable && top.left.type === typeTop.variable) {
      this.IdivVariables(top);
    } else if (top.right.type === typeTop.variable && top.left.type === typeTop.operator) {
      this.IdivOperatorAndVariable(top);
    } else if (top.right.type === typeTop.operator && top.left.type === typeTop.variable) {
      this.IdivVariableAndOperator(top);
    } else {
      throw new Error("Error: Unknown operator for idiv-expression");
    }

    this.AX.top = top;
    this.ChackUseAllVertex();
  }

  private IdivConstants(vtx: Vertex): void {
    //Ділене
    let divided: Register = this.registers[0];

    this.FreeRegister(divided);
    this.fc.mov(divided, vtx.left);

    this.FreeRegister(this.registers[3]);

    //Дільник
    let divider: Register = this.DumpRegister(divided, this.registers[3]);
    this.fc.mov(divider, vtx.right);

    divided.top = vtx.left;
    divider.top = vtx.right;

    this.fcw.idiv(divider);

    divided.top = vtx;
  }

  private IdivOperators(vtx: Vertex): void {

    //Ділене
    let dilene: IVariable = this.FindRegisterByTop(vtx.left) ?? this.FindVariableByTop(vtx.left);
    //Дільник
    let dilnyk: IVariable = this.FindRegisterByTop(vtx.right) ?? this.FindVariableByTop(vtx.right);

    if (dilene instanceof Register && dilnyk instanceof Register) {
      //Dilene is AX
      if (dilene.top !== this.registers[0].top) {
        if (dilnyk.top === this.registers[0].top) {
          this.fcw.swap(dilene, dilnyk);
          [dilene, dilnyk] = [dilnyk, dilene];
        } else {
          this.fcw.swap(dilene, this.registers[0]);
          dilene = this.AX;
        }
      }

      //Dilnyk isnt AX or DX and Dump DX. Busy BX or CX
      if (dilnyk.top === this.DX.top) {
        let temp: Register = this.DumpRegister(this.registers[0], this.registers[3]);
        this.fcw.mov(temp, dilnyk);
        dilnyk.top = null;
        dilnyk = temp;
      } else {
        this.FreeRegister(this.DX);
      }

      //Reserv dilene
      if (this.IsPeriodTop(dilene.top)) {
        if (this.GetPeriodTopUseNumber(dilene.top, this.settingPeriodLoadOperator)) {
          let temp: Register = this.DumpRegister(this.registers[0], this.registers[3], dilnyk as Register);
          this.fcw.mov(temp, dilene);
        } else {
          let varib: Variable = this.CreateTempVariable();
          this.fcw.mov(varib, dilene);
        }
      }
    } else if (dilene instanceof Register) {
      //Dilene is AX
      if (dilene.top !== this.AX.top) {
        this.fcw.swap(dilene, this.AX);
        dilene = this.AX;
      }

      //Clear DX
      this.FreeRegister(this.registers[3]);

      //Busy AX, DX, CX or BX
      let dumpForDilene: Register;
      if (this.IsPeriodTop(dilene.top)) {
        if (this.GetPeriodTopUseNumber(dilene.top, this.settingPeriodLoadOperator)) {
          dumpForDilene = this.DumpRegister(this.registers[0], this.registers[3]);
          this.fcw.mov(dumpForDilene, dilene);
        } else {
          let varib: Variable = this.CreateTempVariable();
          this.fcw.mov(varib, dilene);
        }
      }

      //Dilnyk variable or register
      if (this.IsPeriodTop(dilnyk.top)) {
        if (this.GetPeriodTopUseNumber(dilnyk.top, this.settingPeriodLoadOperator)) {
          let temp: Register = this.DumpRegister(this.registers[0], this.registers[3], dumpForDilene);
          this.fcw.mov(temp, dilnyk);
          dilnyk = temp;
        }
      }
    } else if (dilnyk instanceof Register) {
      if (dilnyk === this.AX) {
        //Dilene is AX,Dilnyk is BX or CX, Clear DX
        let temp: Register = this.DumpRegister(this.AX, this.DX);
        this.fcw.mov(temp, dilnyk);

        this.FreeRegister(this.DX);

        this.fcw.mov(dilnyk, dilene);
        dilene = dilnyk;
        dilnyk = temp;

        if (this.IsPeriodTop(dilene.top)) {
          if (this.GetPeriodTopUseNumber(dilene.top, this.settingPeriodLoadOperator)) {
            let temp: Register = this.DumpRegister(this.AX, this.DX, dilnyk as Register);
            this.fc.mov(temp, dilene);
          }
        }
      }
    } else {
      //dilene is AX, Busy BX or CX. Clear DX
      this.fcw.swap(this.AX, dilene);
      dilene = this.AX;

      let dumpDilene: Register = null;

      this.FreeRegister(this.DX);

      if (this.IsPeriodTop(dilene.top)) {
        if (this.GetPeriodTopUseNumber(dilene.top, this.settingPeriodLoadOperator)) {
          dumpDilene = this.DumpRegister(this.AX, this.DX, dilnyk as Register);
          this.fcw.mov(dumpDilene, dilene);
        }
      }

      if (this.IsPeriodTop(dilnyk.top)) {
        if (this.GetPeriodTopUseNumber(dilnyk.top, this.settingPeriodLoadOperator)) {
          let tmp: Register = this.DumpRegister(this.AX, this.DX, dumpDilene);
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


  private IdivConstantAndOperator(vtx: Vertex) {
    let op: IVariable = this.FindRegisterByTop(vtx.right) ?? this.FindVariableByTop(vtx.right);
    let c: IVariable;

    if (op === null) {
      throw new Error("Error: Unknown IVariable");
    }

    if (op instanceof Register) {
      let temp: Register = null;
      if (op === this.AX) {
        temp = this.DumpRegister(this.AX, this.DX);
        this.fcw.mov(temp, op);
        op = temp;
        this.fcw.mov(this.AX, vtx.left);
        c = this.AX;
      } else if (op === this.DX) {
        temp = this.DumpRegister(this.DX, this.AX);
        this.fcw.mov(temp, op);
        op = temp;
        this.FreeRegister(this.AX, this.AX, this.DX, op as Register);
        this.fcw.mov(this.AX, vtx.left);
        c = this.AX;
      }
    } else {
      if (this.IsPeriodTop(op.top)) {
        if (this.GetPeriodTopUseNumber(op.top, this.settingPeriodLoadOperator)) {
          let temp: Register = this.DumpRegister(this.AX, this.DX);
          this.fcw.mov(temp, op);
          op = temp;
        }
      }
    }

    if (c !== this.AX) {
      this.FreeRegister(this.AX, this.AX, this.DX, op as Register);
      this.fcw.mov(this.AX, vtx.left);
      c = this.AX;
    }

    this.FreeRegister(this.DX, this.AX, this.DX, op as Register);

    this.fcw.idiv(op);
    c.top = vtx;

    if (this.lastIndexTop < this.tops.length - 1) {
      this.CheckUseVertex(this.AX);
      this.CheckUseVertex(this.BX);
      this.CheckUseVertex(this.CX);
      this.CheckUseVertex(this.DX);
    }
  }


  private IdivOperatorAndConstant(vtx: Vertex): void {
    let op: IVariable = this.FindRegisterByTop(vtx.left) ?? this.FindVariableByTop(vtx.left);
    let tempOp: IVariable = null;

    if (op === null) {
      throw new Error("Error: Unknown variable operator");
    }

    let c: IVariable;

    if (op instanceof Register) {
      if (op !== this.AX) {
        this.fcw.mov(this.AX, op);
      }
      if (op === this.DX) {
        if (this.IsPeriodTop(op.top)) {
          if (this.GetPeriodTopUseNumber(op.top, this.settingPeriodLoadOperator)) {
            tempOp = this.DumpRegister(this.AX, this.DX);
            this.fcw.mov(tempOp, op);
          } else {
            this.MoveRegisterToVariable(op);
          }
        }
        op.top = null;
      }
      op = this.AX;
    } else {
      this.FreeRegister(this.AX, this.AX, this.DX);
      this.fcw.mov(this.AX, op);
      if (this.IsPeriodTop(op.top)) {
        if (this.GetPeriodTopUseNumber(op.top, this.settingPeriodLoadOperator)) {
          tempOp = this.DumpRegister(this.AX, this.DX);
          this.fcw.mov(tempOp, op);
        } else {
          this.MoveRegisterToVariable(op);
        }
      }
    }

    c = this.DumpRegister(this.AX, this.DX, tempOp as Register);

    this.CloneOperatorInRegisters(this.AX, this.AX, c as Register, this.DX);

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


  private IdivConstantAndVariable(top: Vertex): void {
    let right: IVariable = this.FindRegisterByTop(top.right);

    if (right === null) {
      right = new Variable(top.right.text);
      right.top = top.right;

      let temp: Register = this.CloneVariableInRegisters(right, this.AX, this.DX);

      if (temp !== null) {
        temp.top = right.top;
        right = temp;
      }
    } else {
      let temp: Register = this.CloneVariableInRegisters(right, this.AX, this.DX);

      if (temp !== null) {
        temp.top = right.top;
        right = temp;
      }
    }

    this.FreeRegister(this.AX, this.AX, this.DX, right as Register);

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

  private IdivVariableAndConstant(top: Vertex): void {
    let left: IVariable = this.FindRegisterByTop(top.left);

    if (left === null) {
      left = new Variable(top.left.text);
      left.top = top.left;

      this.FreeRegister(this.AX, this.AX, this.DX);
      this.fcw.mov(this.AX, left);

      left = this.AX;
    } else if (left !== this.AX) {
      this.FreeRegister(this.AX, this.AX, this.DX);
      this.fcw.mov(this.AX, left);
      left = this.AX;
    }


    let temp: Register = this.CloneVariableInRegisters(left, this.AX, this.DX);

    if (temp !== null) {
      temp.top = left.top;
    }

    this.FreeRegister(this.DX, this.AX, this.DX);

    let right: Register = this.DumpRegister(this.AX, this.DX, temp);

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

  private IdivVariables(vtx: Vertex): void {
    let left: IVariable = this.FindRegisterByTop(vtx.left);
    let right: IVariable = this.FindRegisterByTop(vtx.right);
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
        this.FreeRegister(this.AX, this.AX, this.DX, right as Register);
        this.fcw.mov(this.AX, left);
        left = this.AX;
      }
    } else {
      if (right instanceof Register) {
        if (right === this.AX) {
          let temp: Register = this.CloneVariableInRegisters(right, this.AX, this.DX);

          if (temp === null) {
            right = new Variable(vtx.right.text);
            right.top = vtx.right;
          } else {
            right = temp
          }

          this.fcw.mov(this.AX, left);

        } else {
          this.FreeRegister(this.AX, this.AX, this.DX, right as Register);

          if (right === this.DX) {
            let temp: Register = this.CloneVariableInRegisters(right, this.AX, this.DX);
            if (temp !== null)
              right = temp;
            else {
              right = new Variable(vtx.right.text);
              right.top = vtx.right;
            }
          }

          this.fcw.mov(this.AX, left);

        }
      } else {
        this.FreeRegister(this.AX, this.AX, this.DX, right as Register);
        this.fcw.mov(this.AX, left);
        left = this.AX;




      }

      left = this.AX;
    }

    if (left !== this.AX) {
      throw new Error("Error: left must be AX");
    }
    this.FreeRegister(this.DX, this.AX, this.DX, right as Register);

    let temp: Register = this.CloneVariableInRegisters(left, this.AX, this.DX, right as Register);

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

  private IdivOperatorAndVariable(vtx: Vertex): void {
    let varib: IVariable = this.FindRegisterByTop(vtx.right);
    if (varib === null) {
      varib = new Variable(vtx.right.text);
      varib.top = vtx.right;
      if (this.IsPeriodTop(varib.top)) {
        if (this.GetPeriodTopUseNumber(varib.top, this.settingPeriodLoadOperator)) {
          let temp: Register = this.DumpRegister(this.registers[0], this.registers[3]);
          this.fcw.mov(temp, varib);
          varib = temp;
        }
      }
    }

    let op: IVariable = this.FindRegisterByTop(vtx.left) ?? this.FindVariableByTop(vtx.left);
    if (op === null) {
      throw new Error("Error: Unknown variable");
    }

    //AX
    if (op !== this.AX) {
      if (varib === this.AX) {
        this.fcw.swap(varib, op);
        [varib, op] = [op, varib];
      } else {
        this.fcw.swap(op, this.AX);
        op = this.AX;
      }
    }

    this.FreeRegister(this.DX);

    if (this.IsPeriodTop(op.top)) {
      if (this.GetPeriodTopUseNumber(op.top, this.settingPeriodLoadOperator)) {
        let temp: Register = this.DumpRegister(this.registers[0], this.registers[3], varib as Register);
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

  private IdivVariableAndOperator(vtx: Vertex): void {
    let varib: IVariable = this.FindRegisterByTop(vtx.left);
    let op: IVariable = this.FindRegisterByTop(vtx.right) ?? this.FindVariableByTop(vtx.right);
    if (op === null) {
      throw new Error("Error: Unknown variable");
    }

    if (varib === null) {
      varib = new Variable(vtx.left.text);
      varib.top = vtx.left;

      let temp: Register = this.CloneVariableInRegisters(varib, op as Register, this.AX, this.DX);

      if (temp !== null) {
        varib = temp;
      }
    }

    //AX
    if (varib instanceof Register) {
      if (varib !== this.AX) {
        if (op === this.AX) {
          this.fcw.swap(varib, op);
          [varib, op] = [op, varib];
        } else {
          this.fcw.swap(varib, this.AX);
          varib = this.AX;
        }
      }
    } else {
      if (op === this.AX) {
        let temp: Register = this.DumpRegister(this.AX, this.DX);
        this.fcw.mov(temp, op);
        op = temp;
      }
      this.fcw.mov(this.AX, varib);
      varib = this.AX;
    }


    this.CloneVariableInRegisters(varib, this.AX, this.DX, op as Register);

    this.FreeRegister(this.DX);

    this.fcw.idiv(op);

    varib.top = vtx;

    this.ChackUseAllVertex();
  }




  private ChackUseAllVertex() {
    if (this.lastIndexTop < this.tops.length - 1) {
      this.CheckUseVertex(this.AX);
      this.CheckUseVertex(this.BX);
      this.CheckUseVertex(this.CX);
      this.CheckUseVertex(this.DX);
    }
  }

  private Imul(top: Vertex): void {
    if (top.left.type === typeTop.constant && top.right.type === typeTop.constant) {
      this.ImulConstants(top);
    } else if (top.left.type === typeTop.constant && top.right.type === typeTop.operator  || top.left.type === typeTop.operator && top.right.type === typeTop.constant) {
      this.ImulConstantAndOperator(top);
    } else if (top.left.type === typeTop.operator && top.right.type === typeTop.operator || top.right.type === typeTop.constant && top.left.type === typeTop.variable) {
      this.ImulOperators(top);
    } else if (top.left.type === typeTop.constant && top.right.type === typeTop.variable) {
      this.ImulConstantAndVariable(top);
    } else if (top.right.type === typeTop.variable && top.left.type === typeTop.variable) {
      this.ImulVariables(top);
    } else if (top.right.type === typeTop.variable && top.left.type === typeTop.operator || top.right.type === typeTop.operator && top.left.type === typeTop.variable) {
      this.ImulOperatorAndVariable(top);
    } else {
      throw new Error("Error: Unknown operator for idiv-expression");
    }
    this.AX.top = top;
    this.DX.top = null;
    this.ChackUseAllVertex();
  }

  private ImulConstants(vtx: Vertex): void {
    this.FreeRegister(this.AX, this.AX, this.DX);
    this.FreeRegister(this.DX, this.AX, this.DX);

    this.fcw.mov(this.AX, vtx.left);
    this.fcw.mov(this.DX, vtx.right);

    this.AX.top = vtx.left;
    this.DX.top = vtx.right;

    this.fcw.imul(this.DX);
  }

  private ImulOperators(vtx: Vertex): void {
    let left: IVariable = this.FindRegisterByTop(vtx.left);
    let right: IVariable = this.FindRegisterByTop(vtx.right);
    let multiplier: IVariable = null;
    let op: Register = null;

    if (left === this.AX) {
      op = left as Register;
      this.CloneOperatorInRegisters(op, this.AX, this.DX, right as Register);
    } else if (right === this.AX) {
      op = right as Register;
      this.CloneOperatorInRegisters(op, this.AX, this.DX, right as Register);
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
      } else if (left === this.DX) {
        this.DumpRegister(this.BX, this.CX, this.DX);

        this.fcw.mov(this.AX, this.DX);
        this.fcw.imul(this.DX);
        return;
      } else {
        if (this.GetPeriodTopUseNumber(left.top, this.settingPeriodLoadOperator)) {
          this.FreeRegister(this.AX, this.AX, this.BX, this.CX, this.DX);

          this.fcw.mov(this.AX, left);
          this.fcw.imul(this.AX);
          return;
        } else {
          this.CloneOperatorInRegisters(left, this.AX, this.BX, this.CX, this.DX);
          this.fcw.swap(this.AX, left);
          this.fcw.imul(this.AX);
          return;
        }
      }
    } else {
      if (left === null) {
        left = this.FindVariableByTop(vtx.left);

        let temp: Register = null;
        if (this.GetPeriodTopUseNumber(left.top, this.settingPeriodLoadOperator)) {
          temp = this.CloneOperatorInRegisters(left, this.DX, right as Register, multiplier as Register, op);
        }


        if (temp !== null) {
          left = temp;
        } else {
          multiplier = left;
        }
      }

      if (right === null) {
        right = this.FindVariableByTop(vtx.right);

        let temp: Register = null;
        if (this.GetPeriodTopUseNumber(left.top, this.settingPeriodLoadOperator)) {
          temp = this.CloneOperatorInRegisters(left, this.DX, right as Register, multiplier as Register, op as Register);
        }

        if (temp !== null) {
          right = temp;
        } else if (multiplier === null) {
          multiplier = right;
        } else if (op === null) {
          this.FreeRegister(this.AX, this.AX, this.DX, multiplier as Register, op as Register);
          this.fcw.mov(this.AX, right);
          this.AX.top = right.top;
          right = this.AX;
          op = right as Register;
        }
      }
    }



    if (multiplier === null) {
      if (left === this.DX && left !== op) {
        multiplier = left;
        if (op === null) {
          if (this.IsPeriodTop(right.top) === false) {
            this.fcw.swap(right, this.AX);
          } else {
            this.FreeRegister(this.AX, this.AX, right as Register, this.DX,  multiplier as Register, op as Register);
            this.fcw.mov(this.AX, right);
          }
          op = right = this.AX;
        }
      } else if (right === this.DX && right !== op) {
        multiplier = right;

        if (op === null) {
          if (this.IsPeriodTop(left.top) === false) {
            this.fcw.swap(left, this.AX);
          } else {
            this.FreeRegister(this.AX, this.AX, left as Register, this.DX,  multiplier as Register, op as Register);
            this.fcw.mov(this.AX, left);
          }
          op = left = this.AX;
        }
      } else {
        if (this.IsPeriodTop(left.top) === false && op != left) {
          this.fcw.swap(left, this.DX);
          left = this.DX;
          multiplier = left;


          if (op === null) {
            if (this.IsPeriodTop(right.top) === false) {
              this.fcw.swap(right, this.AX);
            } else {
              this.FreeRegister(this.AX, this.AX, right as Register, this.DX,  multiplier as Register, op as Register);
              this.fcw.mov(this.AX, right);
            }
            op = right = this.AX;
          }

        } else if (this.IsPeriodTop(right.top) === false && op != right) {
          this.fcw.swap(right, this.DX);
          right = this.DX;
          multiplier = right;

          if (op === null) {
            if (this.IsPeriodTop(left.top) === false) {
              this.fcw.swap(left, this.AX);
            } else {
              this.FreeRegister(this.AX, this.AX, left as Register, this.DX,  multiplier as Register, op as Register);
              this.fcw.mov(this.AX, left);
            }
            op = left = this.AX;
          }

        } else {
          if (op === null) {
            this.FreeRegister(this.AX, this.AX, this.BX, this.CX, this.DX);

            this.fcw.mov(this.AX, left);
            op = left = this.AX;
            multiplier = right;
          } else if (op === left) {
            multiplier = right;
          } else if (op === right) {
            multiplier = left;
          } else {
            throw new Error();
          }
        }
      }
    } else if (op === null) {
      if (this.IsPeriodTop(left.top) === false && multiplier === right) {
        this.fcw.swap(left, this.AX);
        op = left = this.AX;
      } else if (this.IsPeriodTop(right.top) === false && multiplier === left) {
        this.fcw.swap(right, this.AX);
        op = right = this.AX;
      } else {
        this.FreeRegister(this.AX, this.AX, left as Register, this.DX,  multiplier as Register, op as Register);
        this.fcw.mov(this.AX, left);

        this.FreeRegister(this.AX, this.AX, this.BX, this.CX, this.DX,  multiplier as Register, op as Register);

        if (multiplier === left) {
          this.fcw.mov(this.AX, right);
          op = right = this.AX;
        } else if (multiplier === right) {
          this.fcw.mov(this.AX, left);
          op = left = this.AX;
        }
      }
    }

    if (multiplier !== this.DX) {
      this.FreeRegister(this.DX, this.AX, multiplier as Register, this.DX,  multiplier as Register, op as Register);
    }

    if (op !== this.AX || multiplier === null) {
      throw new Error();
    }

    this.fcw.imul(multiplier);
  }

  private CloneOperatorInRegisters(op: IVariable, ...notUseRegisters: Register[]): Register {
    //Reserv dilene
    if (this.IsPeriodTop(op.top)) {
      if (this.GetPeriodTopUseNumber(op.top, this.settingPeriodLoadOperator)) {
        let temp: Register = this.DumpRegister(...notUseRegisters);
        this.fcw.mov(temp, op);
        return temp;
      } else if (op instanceof Register) {
        let varib: Variable = this.CreateTempVariable();
        this.fcw.mov(varib, op);
      }
    }
    return null;
  };

  private ImulConstantAndOperator(vtx: Vertex) {
    let op: Vertex;
    let c: Vertex;

    [op, c] = vtx.left.type === typeTop.operator ? [vtx.left, vtx.right] : [vtx.right, vtx.left];

    let opIVar: IVariable = this.FindRegisterByTop(op);
    let mnognyk: IVariable = null;
    let mnogene: Register = null;

    if (opIVar === this.AX) {
      mnogene = opIVar as Register;
      this.FreeRegister(this.DX, this.AX, this.DX);
      this.fcw.mov(this.DX, c);
      mnognyk = this.DX;
    }


    if (opIVar === null) {
      opIVar = this.FindVariableByTop(op);

      let temp: Register = null;
      if (this.GetPeriodTopUseNumber(opIVar.top, this.settingPeriodLoadOperator)) {
        temp = this.CloneOperatorInRegisters(opIVar, this.DX);
      }

      if (temp !== null) {
        opIVar = temp;
      } else {
        mnognyk = opIVar;
        
        this.FreeRegister(this.AX, this.AX, this.DX);
        this.fcw.mov(this.AX, c);
        mnogene = this.AX;
      }
    }

    if (mnognyk === null) {
      if (opIVar === this.DX) {
        mnognyk = opIVar;
      } else if (this.IsPeriodTop(op) === false) {
          this.fcw.swap(opIVar, this.DX);
          mnognyk = opIVar = this.DX;
      } 

      this.FreeRegister(this.AX, this.AX, this.DX);
      this.fcw.mov(this.AX, c);
      mnogene = this.AX;

    }

    if (mnognyk !== this.DX) {
      this.FreeRegister(this.DX, this.AX, mnognyk as Register, this.DX);
    } else {
      this.CloneOperatorInRegisters(opIVar, this.DX, this.AX);
    }

    if (mnogene !== this.AX || mnognyk === null) {
      throw new Error();
    }

    this.fcw.imul(mnognyk);
  }


  //Not
  private ImulConstantAndVariable(vtx: Vertex): void {
    let varib: Vertex;
    let c: Vertex;

    [varib, c] = vtx.left.type === typeTop.variable ? [vtx.left, vtx.right] : [vtx.right, vtx.left];

    let varIVar: IVariable = this.FindRegisterByTop(varib);
    let mnognyk: IVariable = null;
    let mnogene: Register = null;

    if (varIVar === this.AX) {
      mnogene = varIVar as Register;
      this.FreeRegister(this.DX, this.AX, this.DX);
      this.fcw.mov(this.DX, c);
      mnognyk = this.DX;
    }


    if (varIVar === null) {
      varIVar = Variable.CreateVariableBasedVertex(varib);

      let temp: Register = this.CloneVariableInRegisters(varIVar);


      if (temp !== null) {
        varIVar = temp;
      } else {
        mnognyk = varIVar;
        
        this.FreeRegister(this.AX, this.AX, this.DX);
        this.fcw.mov(this.AX, c);
        mnogene = this.AX;
      }
    }

    if (mnognyk === null) {
      if(varIVar === this.AX){
        mnogene = varIVar as Register;
        this.FreeRegister(this.DX, this.AX, this.DX);
        this.fcw.mov(this.DX, c);
        mnognyk = this.DX;
      } else  {
        if (this.IsPeriodTop(varib) === false){
          this.fcw.swap(varIVar, this.DX);
          varIVar = this.DX;          
        }
        mnognyk = varIVar;

        this.FreeRegister(this.AX, this.AX, this.DX, mnognyk as Register);
        this.fcw.mov(this.AX, c);
        mnogene = this.AX;
      }
    }

    if (mnognyk !== this.DX) {
      this.FreeRegister(this.DX, this.AX, mnognyk as Register, this.DX);
    } else {
      this.CloneOperatorInRegisters(varIVar, this.DX, this.AX);
    }

    if (mnogene !== this.AX || mnognyk === null) {
      throw new Error();
    }

    this.fcw.imul(mnognyk);

  }

  private ImulVariables(vtx: Vertex): void {
    let left: IVariable = this.FindRegisterByTop(vtx.left);
    let right: IVariable = this.FindRegisterByTop(vtx.right);
    let multiplier: IVariable = null;
    let op: Register = null;

    if (left === this.AX) {
      op = left as Register;
    } else if (right === this.AX) {
      op = right as Register;
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
        let temp: Register = this.CloneVariableInRegisters(op, this.AX, this.DX);
        if(temp !== null){
          temp.top = op.top;
        }
        this.fcw.imul(this.AX);
        return;
      } else if (left === this.DX) {
        this.DumpRegister(this.BX, this.CX, this.DX);

        this.fcw.mov(this.AX, this.DX);
        this.fcw.imul(this.DX);
        return;
      } else {
        if (this.GetPeriodTopUseNumber(left.top, this.settingPeriodLoadVariable)) {
          this.FreeRegister(this.AX, this.AX, left as Register, this.DX);

          this.fcw.mov(this.AX, left);
          this.fcw.imul(this.AX);
          return;
        } else {
          this.fcw.swap(this.AX, left);
          this.fcw.imul(this.AX);
          return;
        }
      }
    } else {
      if (left === null) {
        left = new Variable(vtx.left.text);
        left.top = vtx.left.top;

        let temp: Register = null;
        temp = this.CloneVariableInRegisters(left, this.DX, right as Register);

        if (temp !== null) {
          left = temp;
        } else {
          multiplier = left;
        }
      }

      if (right === null) {
        right = new Variable(vtx.right.text);
        right.top = vtx.right.top;

        let temp: Register = null;
        temp = this.CloneVariableInRegisters(right, this.DX, left as Register);

        if (temp !== null) {
          right = temp;
        } else if (multiplier === null) {
          multiplier = right;
        } else if (op === null) {
          this.FreeRegister(this.AX, this.AX, this.DX);
          this.fcw.mov(this.AX, right);
          this.AX.top = right.top;
          right = this.AX;
          op = right as Register;
        }
      }
    }



    if (multiplier === null) {
      if (left === this.DX && left !== op) {
        multiplier = left;
        if (op === null) {
          if (this.IsPeriodTop(right.top) === false) {
            this.fcw.swap(right, this.AX);
          } else {
            this.FreeRegister(this.AX, this.AX, right as Register, this.DX);
            this.fcw.mov(this.AX, right);
          }
          op = right = this.AX;
        }
      } else if (right === this.DX && right !== op) {
        multiplier = right;

        if (op === null) {
          if (this.IsPeriodTop(left.top) === false) {
            this.fcw.swap(left, this.AX);
          } else {
            this.FreeRegister(this.AX, this.AX, left as Register, this.DX);
            this.fcw.mov(this.AX, left);
          }
          op = left = this.AX;
        }
      } else {
        if (this.IsPeriodTop(left.top) === false && op != left) {
          this.fcw.swap(left, this.DX);
          left = this.DX;
          multiplier = left;


          if (op === null) {
            if (this.IsPeriodTop(right.top) === false) {
              this.fcw.swap(right, this.AX);
            } else {
              this.FreeRegister(this.AX, this.AX, right as Register, this.DX);
              this.fcw.mov(this.AX, right);
            }
            op = right = this.AX;
          }

        } else if (this.IsPeriodTop(right.top) === false && op != right) {
          this.fcw.swap(right, this.DX);
          right = this.DX;
          multiplier = right;

          if (op === null) {
            if (this.IsPeriodTop(left.top) === false) {
              this.fcw.swap(left, this.AX);
            } else {
              this.FreeRegister(this.AX, this.AX, left as Register, this.DX);
              this.fcw.mov(this.AX, left);
            }
            op = left = this.AX;
          }

        } else {
          if (op === null) {
            this.FreeRegister(this.AX, this.AX, this.BX, this.CX, this.DX);

            this.fcw.mov(this.AX, left);
            op = left = this.AX;
            multiplier = right;
          } else if (op === left) {
            multiplier = right;
          } else if (op === right) {
            multiplier = left;
          } else {
            throw new Error();
          }
        }
      }
    } else if (op === null) {
      if (this.IsPeriodTop(left.top) === false && multiplier === right) {
        this.fcw.swap(left, this.AX);
        op = left = this.AX;
      } else if (this.IsPeriodTop(right.top) === false && multiplier === left) {
        this.fcw.swap(right, this.AX);
        op = right = this.AX;
      } else {
        this.FreeRegister(this.AX, this.AX, left as Register, this.DX);
        this.fcw.mov(this.AX, left);

        this.FreeRegister(this.AX, this.AX, this.BX, this.CX, this.DX);

        if (multiplier === left) {
          this.fcw.mov(this.AX, right);
          op = right = this.AX;
        } else if (multiplier === right) {
          this.fcw.mov(this.AX, left);
          op = left = this.AX;
        }
      }
    }

    if (multiplier !== this.DX) {
      this.FreeRegister(this.DX, this.AX, multiplier as Register, this.DX);
    }

    if (op !== this.AX || multiplier === null) {
      throw new Error();
    }

    this.fcw.imul(multiplier);
  }

  
  private ImulOperatorAndVariable(vtx: Vertex): void {
    let varib: Vertex;
    let op: Vertex;

    [varib, op] = vtx.left.type === typeTop.variable ? [vtx.left, vtx.right] : [vtx.right, vtx.left];

    let varibIVar: IVariable = this.FindRegisterByTop(varib);
    let opIVar: IVariable = this.FindRegisterByTop(op);
    let mnognyk: IVariable = null;
    let mnogene: Register = null;

    if (varibIVar === this.AX) {
      mnogene = varibIVar as Register;
    } else if (opIVar === this.AX) {
      mnogene = opIVar as Register;
    }


    if (varibIVar === null) {
      varibIVar = Variable.CreateVariableBasedVertex(varib);

      let temp: Register = null;
      temp = this.CloneVariableInRegisters(varibIVar, this.DX, opIVar as Register);

      if (temp !== null) {
        varibIVar = temp;
      } else {
        mnognyk = varibIVar;
      }
    }

    if (opIVar === null) {
      opIVar = this.FindVariableByTop(op);

      let temp: Register = null;
      if (this.GetPeriodTopUseNumber(op, this.settingPeriodLoadOperator)) {
        temp = this.CloneOperatorInRegisters(opIVar, this.DX, varibIVar as Register);
      }

      if (temp !== null) {
        opIVar = temp;
      } else if (mnognyk === null) {
        mnognyk = opIVar;
      } else if (mnogene === null) {
        this.FreeRegister(this.AX, this.AX, this.DX);
        this.fcw.mov(this.AX, opIVar);
        this.AX.top = opIVar.top;
        opIVar = this.AX;
        mnogene = opIVar as Register;
      }
    }




    if (mnognyk === null) {
      if (varibIVar === this.DX && varibIVar !== mnogene) {
        mnognyk = varibIVar;
        if (mnogene === null) {
          if (this.IsPeriodTop(opIVar.top) === false) {
            this.fcw.swap(opIVar, this.AX);
          } else {
            this.FreeRegister(this.AX, this.AX, opIVar as Register, this.DX);
            this.fcw.mov(this.AX, opIVar);
          }
          mnogene = opIVar = this.AX;
        }
      } else if (opIVar === this.DX && opIVar !== mnogene) {
        mnognyk = opIVar;

        if (mnogene === null) {
          if (this.IsPeriodTop(varibIVar.top) === false) {
            this.fcw.swap(varibIVar, this.AX);
          } else {
            this.FreeRegister(this.AX, this.AX, varibIVar as Register, this.DX);
            this.fcw.mov(this.AX, varibIVar);
          }
          mnogene = varibIVar = this.AX;
        }
      } else {
        if (this.IsPeriodTop(varibIVar.top) === false && mnogene != varibIVar) {
          this.fcw.swap(varibIVar, this.DX);
          varibIVar = this.DX;
          mnognyk = varibIVar;


          if (mnogene === null) {
            if (this.IsPeriodTop(opIVar.top) === false) {
              this.fcw.swap(opIVar, this.AX);
            } else {
              this.FreeRegister(this.AX, this.AX, opIVar as Register, this.DX);
              this.fcw.mov(this.AX, opIVar);
            }
            mnogene = opIVar = this.AX;
          }

        } else if (this.IsPeriodTop(opIVar.top) === false && mnogene != opIVar) {
          this.fcw.swap(opIVar, this.DX);
          opIVar = this.DX;
          mnognyk = opIVar;

          if (mnogene === null) {
            if (this.IsPeriodTop(varibIVar.top) === false) {
              this.fcw.swap(varibIVar, this.AX);
            } else {
              this.FreeRegister(this.AX, this.AX, varibIVar as Register, this.DX);
              this.fcw.mov(this.AX, varibIVar);
            }
            mnogene = varibIVar = this.AX;
          }

        } else {
          if (mnogene === null) {
            this.FreeRegister(this.AX, this.AX, this.BX, this.CX, this.DX);

            this.fcw.mov(this.AX, varibIVar);
            mnogene = varibIVar = this.AX;
            mnognyk = opIVar;
          } else if (mnogene === varibIVar) {
            mnognyk = opIVar;
          } else if (mnogene === opIVar) {
            mnognyk = varibIVar;
          } else {
            throw new Error();
          }
        }
      }
    } else if (mnogene === null) {
      if (this.IsPeriodTop(varibIVar.top) === false && mnognyk === opIVar) {
        this.fcw.swap(varibIVar, this.AX);
        mnogene = varibIVar = this.AX;
      } else if (this.IsPeriodTop(opIVar.top) === false && mnognyk === varibIVar) {
        this.fcw.swap(opIVar, this.AX);
        mnogene = opIVar = this.AX;
      } else {
        this.FreeRegister(this.AX, this.AX, varibIVar as Register, this.DX);
        this.fcw.mov(this.AX, varibIVar);

        this.FreeRegister(this.AX, this.AX, this.BX, this.CX, this.DX);

        if (mnognyk === varibIVar) {
          this.fcw.mov(this.AX, opIVar);
          mnogene = opIVar = this.AX;
        } else if (mnognyk === opIVar) {
          this.fcw.mov(this.AX, varibIVar);
          mnogene = varibIVar = this.AX;
        }
      }
    }

    if (mnognyk !== this.DX) {
      this.FreeRegister(this.DX, this.AX, mnognyk as Register);
    }

    if (mnogene !== this.AX || mnognyk === null) {
      throw new Error();
    }

    this.fcw.imul(mnognyk);
  }


  private CloneVariableInRegisters(varib: IVariable, ...notUseRegisters: Register[]): Register {
    if (this.IsPeriodTop(varib.top)) {
      if (this.GetPeriodTopUseNumber(varib.top, this.settingPeriodLoadVariable)) {
        let temp: Register = this.DumpRegister(...notUseRegisters);
        this.fcw.mov(temp, varib);
        return temp;
      }
    }
    return null;
  }



  private CheckUseVertex(ivar: IVariable) {
    if (this.FindTopsByTop(ivar.top) === false) {
      ivar.top = null;
      ivar.isAvailable = true;
    }
  }



  private DumpRegister(...notUseRegisters: Register[]): Register {
    for (let i = 0; i < this.registers.length; i++) {
      if (notUseRegisters.indexOf(this.registers[i]) !== -1) continue;
      if (this.registers[i].isAvailable) {
        return this.registers[i];
      }
    }

    let binaryPeriod: number[] = new Array<number>(this.registers.length);
    for (let j = 0; j < this.registers.length; j++) {
      binaryPeriod[j] = notUseRegisters.indexOf(this.registers[j]) !== -1 ? 0 : this.GetPeriodTop(this.registers[j].top);
    }

    let periodRes: number = Math.max(...binaryPeriod);
    let res: Register = this.registers[binaryPeriod.indexOf(periodRes)]

    if (res.top.type === typeTop.variable) {
      return res;
    }

    let varib: Variable = this.CreateTempVariable();

    this.fcw.mov(varib, res);

    return res;
  }

  private MoveRegisterToVariable(reg: IVariable): boolean {
    if (reg.isAvailable || reg.top.type === typeTop.variable) {
      reg.top = null;
      return false;
    }

    let varib: Variable = this.CreateTempVariable();

    this.fcw.mov(varib, reg);

    reg.top = null;
    return true;
  }

  private FreeRegister(reg: Register, ...useNotRegisters: Register[]): boolean {
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

    let repl: Register = null;
    for (let i = 0; i < this.registers.length; i++) {
      if (useNotRegisters.some(e => e === this.registers[i]) === false && (this.registers[i].isAvailable || this.registers[i].top.type === typeTop.variable)) {
        repl = this.registers[i];
        break;
      }
    }

    if (repl !== null) {
      this.fcw.mov(repl, reg);
    } else {
      let varib: Variable = this.CreateTempVariable();

      this.fcw.mov(varib, reg);
    }

    reg.top = null;
    return true;
  }

  private FindRegisterByTop(top: Vertex): Register {
    for (let i = 0; i < this.registers.length; i++) {
      if (this.registers[i].top === top)
        return this.registers[i];
    }
    return null;
  }

  private FindVariableByTop(top: Vertex): Variable {
    for (let i = 0; i < this.variables.length; i++) {
      if (this.variables[i].top === top) {
        return this.variables[i];
      }
    }
    return null;
  }

  private CreateTempVariable(): Variable {
    for (let i = 0; i < this.variables.length; i++) {
      if (this.variables[i].isAvailable) {
        return this.variables[i];
      } else if (this.IsPeriodTop(this.variables[i].top) === false) {
        return this.variables[i];
      }
    }

    const add: Variable = new Variable(`tmp${this.variables.length}`);
    this.variables.push(add);
    return add;
  }

  private FindTopsByTop(vtx: Vertex): boolean {
    for (let i = this.lastIndexTop + 1; i < this.tops.length; i++) {
      if (this.tops[i].Avaible(vtx)) {
        return true;
      }
    }
    return false;
  }

  private GetPeriodTop(vtx: Vertex): number {
    for (let i = this.lastIndexTop + 1; i < this.tops.length; i++) {
      if (this.tops[i].Avaible(vtx)) {
        return i - this.lastIndexTop;
      }
    }
    return Number.POSITIVE_INFINITY;
  }

  private GetPeriodTopUseNumber(vtx: Vertex, period: number): boolean {
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

  private IsPeriodTop(vtx: Vertex): boolean {
    for (let i = this.lastIndexTop + 1; i < this.tops.length; i++) {
      if (this.tops[i].Avaible(vtx)) {
        return true;
      }
    }
    return false;
  }
}