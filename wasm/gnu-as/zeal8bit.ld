/* Zeal 8-bit Memory Map */
MEMORY
{
    ROM  (rx) : ORIGIN = 0x0000, LENGTH = 16K
    VRAM (rw) : ORIGIN = 0x4000, LENGTH = 16K
    RAM  (rw) : ORIGIN = 0x8000, LENGTH = 32K
}

/* Define the entry point (adjust to your reset routine symbol) */
ENTRY(_start)

SECTIONS
{
    /* Reset vector at the very beginning of ROM */
    .reset 0x0000 : {
        KEEP(*(.reset))         /* Reset vector section */
    } > ROM

    /* Code and read-only data go in ROM */
    .text : {
        KEEP(*(.text._start))   /* Ensure _start is first */
        *(.text)                /* program code */
        *(.text.*)
    } > ROM

    .rodata : {
        *(.rodata)              /* constants, lookup tables */
        *(.rodata.*)
    } > ROM

    /* Data section: initialized variables */
    /* Store in ROM but will be copied to RAM at runtime */
    .data : {
        __data_start_ram = .;   /* Start of .data in RAM */
        __data_start_rom = LOADADDR(.data);
        *(.data)                /* initialized variables */
        *(.data.*)
        __data_end_ram = .;
    } > RAM AT > ROM

    /* Calculate size of .data section */
    __data_size = SIZEOF(.data);

    /* Uninitialized data (zero-filled) in RAM1 */
    .bss (NOLOAD) : {
        __bss_start = .;
        *(.bss)
        *(.bss.*)
        *(COMMON)
        __bss_end = .;
    } > RAM

    /* Symbols for stack handling */
    __stack_top   = ORIGIN(RAM) + LENGTH(RAM);   /* 0xFFFF */
    __stack_limit = __stack_top - 0x0800;          /* reserve 2 KB */
}