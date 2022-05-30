enum ivalType{
    register,
    variable
}

interface IVariable extends IVertex{
    isAvailable: boolean;
    top: Vertex;
    name: string;
}

interface IVertex{
    top: Vertex;
}