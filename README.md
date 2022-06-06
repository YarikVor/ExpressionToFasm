https://yarikvor.github.io/ExpressionToFasm/

Перетворює приклад/вираз в FASM-код типу emu8086. **МОЖЛИВІ ПОМИЛКИ!!!** при компіляції

------------

Приклад: `a + b * c - d`
Бінарне дерево:
`1. b * c`, `2. a + [1]`, `3. [2] - d`

Результат коду:

```
; 1
mov AX, c
imul b
; 2
add AX, a
; 3
sub AX, d

```

------------

Приклад: `(3 * a ^ 2 * b - x)/(c + 5) - 2 * (x * x + 1) + (4 * a * x)/(b ^ 2 * c);`

Код на с++:
```cpp
#include <iostream>

using namespace std;

int main(){
    short a = 4;
    short b = 3;
    short c = 2;
    short x = 1;
    
    short res = (3 * (a * a) * b - x) / (c + 5) - 2 * (x * x + 1) + (4 * a * x)/(b * b * c);

    cout << res;

    return 0;
}
```

Результат коду:

```
; 1
mov AX, a
mov BX, AX
imul AX
; 2
mov DX, 3
imul DX
; 3
mov CX, b
imul CX
; 4
mov DX, x
sub AX, DX
; 5
mov CX, c
add CX, 5
; 6
cwd
idiv CX
; 7
mov tmp0, AX
mov AX, x
mov CX, AX
imul AX
; 8
add AX, 1
; 9
mov DX, 2
imul DX
; 10
mov DX, tmp0
sub DX, AX
; 11
xchg BX, DX
mov AX, 4
imul DX
; 12
xchg CX, DX
imul DX
; 13
mov tmp0, AX
mov AX, b
imul AX
; 14
imul c
; 15
mov CX, AX
mov AX, tmp0
cwd
idiv CX
; 16
add BX, AX
```
