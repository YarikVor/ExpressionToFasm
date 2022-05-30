class DebuggerFasm {
    constructor(fcomp) {
        this.fcomp = fcomp;
        this.getRegistry = document.getElementById("registers");
        this.getCode = document.getElementById("code");
        this.getListVertex = document.getElementById("listVertex");
        this.getVar = document.getElementById("var");
    }
    Start() {
        this.CreateVertex();
        this.UpdateRegisters();
    }
    Update() {
        this.fcomp.Step();
        this.UpdateCode();
        this.UpdateVertex();
        this.UpdateRegisters();
        this.UpdateVar();
    }
    UpdateRegisters() {
        this.getRegistry.innerHTML = "";
        for (let i = 0; i < this.fcomp.registers.length; i++) {
            let reg = this.fcomp.registers[i];
            let textTop = reg.top === null ? "null" : reg.top.type === typeTop.constant || reg.top.type === typeTop.variable ? reg.top.text : "[" + (this.findIndexVertex(reg.top) + 1) + "]";
            this.getRegistry.innerHTML += `${reg.name} = ${textTop}<br/>`;
        }
    }
    UpdateVertex() {
        if (this.fcomp.lastIndexTop < this.fcomp.tops.length)
            this.getListVertex.getElementsByTagName("li")[this.fcomp.lastIndexTop].classList.add("active");
        this.getListVertex.getElementsByTagName("li")[this.fcomp.lastIndexTop - 1].classList.remove("active");
        this.getListVertex.getElementsByTagName("li")[this.fcomp.lastIndexTop - 1].classList.add("disabled");
    }
    UpdateVar() {
        this.getVar.innerHTML = "";
        for (let i = 0; i < this.fcomp.variables.length; i++) {
            let variab = this.fcomp.variables[i];
            let textTop = variab.top === null ? "null" : variab.top.type === typeTop.constant || variab.top.type === typeTop.variable ? variab.top.text : "[" + (this.findIndexVertex(variab.top) + 1) + "]";
            this.getVar.innerHTML += `${variab.name} ${textTop} avaible: ${variab.isAvailable}<br/>`;
        }
    }
    CreateVertex() {
        for (let i = 0; i < this.fcomp.tops.length; i++) {
            let top = this.fcomp.tops[i];
            ;
            let node = document.createElement("li");
            let leftText = top.left.type === typeTop.constant || top.left.type === typeTop.variable ? top.left.text : `[${this.findIndexVertex(top.left) + 1}]`;
            let rightText = top.right.type === typeTop.constant || top.right.type === typeTop.variable ? top.right.text : `[${this.findIndexVertex(top.right) + 1}]`;
            node.innerHTML = `${leftText} ${top.text} ${rightText}`;
            this.getListVertex.appendChild(node);
        }
    }
    findIndexVertex(vtx) {
        for (let i = 0; i < this.fcomp.tops.length; i++) {
            if (this.fcomp.tops[i] === vtx)
                return i;
        }
        return -1;
    }
    UpdateCode() {
        document.getElementById("codearea").innerHTML = this.fcomp.fc.code;
    }
}
