/*
Константи: [0-9]+
Пропуск: / /
Зміні: [a-z]
Знаки:
	+
	-
	*	
	/
Парні знаки: ()
*/

//Lorem Ipsum 

let b : BinaryTree = new BinaryTree();

let formula: string = window.prompt("Input Expression").replaceAll(" ", "");

b.CompileTextToTops(formula);
console.log(b.tops);
b.Optimization();
console.log(b.tops);

let c : FASMCompilator = new FASMCompilator(b.tops, b.variables);
// c.Compilation();
// console.log(c);
// console.log(formula);
// console.log(c.fc.code);


let d : DebuggerFasm = new DebuggerFasm(c);
d.Start();

document.getElementById("step").addEventListener("click", () => {d.Update();});