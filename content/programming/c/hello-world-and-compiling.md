# Hello world and compiling

C source code is turned into a runnable program by a [[compiler]].

```c
#include <stdio.h>

int main(void) {
    printf("Hello, world!\n");
    return 0;
}
```

- `#include <stdio.h>` pulls in a [[header file]] that declares `printf`.
- `main` is where the program starts. Returning `0` means success.

## Compile and run
```bash
gcc hello.c -o hello
./hello
```

<mark>Coming from Java:</mark> there is no virtual machine. The compiler produces native machine code for your computer directly.
