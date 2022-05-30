class DebuggerFasm{
    constructor(public fcomp: FASMCompilator){}

    public getRegistry = document.getElementById("registers");
    public getCode = document.getElementById("code");
    public getListVertex = document.getElementById("listVertex");
    public getVar = document.getElementById("var");


    public Start(): void{
        this.CreateVertex();
        this.UpdateRegisters();
    }

    public Update(): void{
        
        this.fcomp.Step();
        this.UpdateCode();
        this.UpdateVertex();
        this.UpdateRegisters();
        this.UpdateVar();
    }

    private UpdateRegisters(): void{
        this.getRegistry.innerHTML = "";

        for(let i = 0; i < this.fcomp.registers.length; i++){
            let reg = this.fcomp.registers[i];
            let textTop: string = reg.top === null ? "null" : reg.top.type === typeTop.constant || reg.top.type === typeTop.variable ? reg.top.text : "[" + (this.findIndexVertex(reg.top) + 1) + "]";

            this.getRegistry.innerHTML += `${reg.name} = ${textTop}<br/>`;
        }
    }
    private UpdateVertex(): void{
        if(this.fcomp.lastIndexTop < this.fcomp.tops.length)
            this.getListVertex.getElementsByTagName("li")[this.fcomp.lastIndexTop].classList.add("active");
        this.getListVertex.getElementsByTagName("li")[this.fcomp.lastIndexTop - 1].classList.remove("active");
        this.getListVertex.getElementsByTagName("li")[this.fcomp.lastIndexTop - 1].classList.add("disabled");
    }

    private UpdateVar(): void {
        this.getVar.innerHTML = "";

        for(let i = 0; i < this.fcomp.variables.length; i++){
            let variab = this.fcomp.variables[i];
            let textTop: string = variab.top === null ? "null" : variab.top.type === typeTop.constant || variab.top.type === typeTop.variable ? variab.top.text : "[" + (this.findIndexVertex(variab.top) + 1) + "]";
            this.getVar.innerHTML += `${variab.name} ${textTop} avaible: ${variab.isAvailable}<br/>`;
        }
    }

    private CreateVertex(): void{
        for(let i = 0; i < this.fcomp.tops.length; i++){
            let top: Vertex = this.fcomp.tops[i];;
            let node: HTMLElement = document.createElement("li");

            let leftText: string = top.left.type === typeTop.constant || top.left.type === typeTop.variable ? top.left.text : `[${this.findIndexVertex(top.left) + 1}]`;
            let rightText: string = top.right.type === typeTop.constant || top.right.type === typeTop.variable ? top.right.text : `[${this.findIndexVertex(top.right) + 1}]`;
            
            node.innerHTML = `${leftText} ${top.text} ${rightText}`;

            this.getListVertex.appendChild(node);
        }
       
    }

    private findIndexVertex(vtx: Vertex): number{
        for(let i = 0; i < this.fcomp.tops.length; i++){
            if(this.fcomp.tops[i] === vtx)
                return i;
        }
        return -1;
    }

    private UpdateCode(): void{
        document.getElementById("codearea").innerHTML = this.fcomp.fc.code;
    }
}