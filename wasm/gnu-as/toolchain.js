/**
 * GnuToolchain
 * ============
 *
 * A thin JavaScript wrapper around Emscripten-compiled GNU toolchain modules
 * (`as`, `ld`, `objcopy`). It allows you to assemble, link, and convert binary
 * code entirely in the browser (or Node.js) using an in-memory filesystem.
 *
 * ---
 * Constructor Options
 * -------------------
 * new GnuToolchain({ log, logErr, verbose })
 *
 * @param {function} [log]     Optional custom logging function for stdout.
 *                             Defaults to a prefixed console.warn logger.
 *
 * @param {function} [logErr]  Optional custom logging function for stderr.
 *                             Defaults to a prefixed console.warn logger.
 *
 * @param {boolean} [verbose]  Enables verbose mode. When true:
 *                               - Passes `-verbose` to `ld`
 *                               - Passes `--verbose` to `objcopy`
 *                               - Logs intermediate artifacts (object, ELF, bin)
 *
 * ---
 * Methods
 * -------
 *
 * async as(fileName, text)
 *   Assemble a source string into an object file (.o) and a listing (.lst).
 *
 *   @param {string} fileName - Base filename for generated files.
 *   @param {string} text     - Assembly source code.
 *   @return {Promise<{obj: Uint8Array, listing: string}>}
 *     - obj: Assembled object file bytes
 *     - listing: Assembly listing file (human-readable)
 *
 * async ld(fileName, obj)
 *   Link an object file into an ELF binary and produce a map file.
 *
 *   @param {string} fileName - Base filename for generated files.
 *   @param {Uint8Array} obj  - Input object file bytes.
 *   @return {Promise<{elf: Uint8Array, map: string}>}
 *     - elf: Linked ELF file bytes
 *     - map: Linker map (memory layout, symbols, sections)
 *
 * async objcopy(fileName, elf)
 *   Extract binary sections from an ELF into a raw binary (.bin).
 *
 *   @param {string} fileName - Base filename for generated files.
 *   @param {Uint8Array} elf  - Input ELF file bytes.
 *   @return {Promise<{bin: Uint8Array}>}
 *     - bin: Raw binary image
 *
 * async execute(fileName, text)
 *   Convenience method that runs `as`, `ld`, and `objcopy` in sequence.
 *
 *   @param {string} fileName - Base filename for generated files.
 *   @param {string} text     - Assembly source code.
 *   @return {Promise<{obj: Uint8Array, listing: string, elf: Uint8Array, map: string, bin: Uint8Array}>}
 *     - obj: Object file
 *     - listing: Assembly listing
 *     - elf: ELF binary
 *     - map: Linker map
 *     - bin: Raw binary image
 *
 * ---
 * Example Usage
 * -------------
 *
 * const toolchain = new GnuToolchain({ verbose: true });
 *
 * (async () => {
 *   const { obj, listing, elf, map, bin } =
 *     await toolchain.execute("hello", `
 *       .globl _start
 *     _start:
 *       mov $1, %eax
 *       ret
 *     `);
 *
 *   console.log("Listing:\n", listing);
 *   console.log("Linker map:\n", map);
 *   console.log("Raw binary size:", bin.length);
 * })();
 *
 */

class GnuToolchain {
  constructor({ log = null, logErr = null, verbose = false } = {}) {
    this.verbose = verbose;
    this.includes = [];
    this.linker = {
      script: null,
    };
    this.org = '0x0000';
    this.errors = [];
    this.defaultModule = {
      print: log ?? this.log('stdout'),
      printErr: logErr ?? this.log('stderr'),
      noInitialRun: true,
    };
  }

  /**
   * Create a logging function with a prefix.
   *
   * @param {string} prefix - Optional prefix string for the logger.
   * @returns {function(string, ...any): void} A function that logs messages with the given prefix.
   */
  log(prefix = '') {
    return (text, ...args) => {
      console.warn(prefix, text, ...args);
    };
  }

  /**
   * Assemble source code into an object file (.o) and listing file (.lst).
   *
   * @async
   * @param {string} fileName - Base filename to use for output files.
   * @param {string} text - Assembly source code to assemble.
   * @returns {Promise<{obj: Uint8Array, listing: string}>}
   *   - obj: Object file bytes
   *   - listing: Human-readable assembly listing
   */
  async as(fileName, text) {
    const mod = await GnuAsModule({
      ...this.defaultModule,
      printErr: (msg, ...args) => {
        this.defaultModule.printErr(msg, ...args);
        const regex = /^(?!.*warning:).*?(?:([\w\/\.\-]+):(\d+):)?/;

        const match = msg.match(regex);
        const [_, filename, lineNum] = match;
        this.errors.push({
          source: 'ld',
          filename,
          lineNum,
          message: msg,
        });
      },
    });

    mod.FS.mkdir('/src');
    mod.FS.writeFile(`/src/${fileName}`, text);

    // mkdirs
    let includePaths = [];
    for (const include in this.includes) {
      const path = include.slice(0, include.lastIndexOf('/'));
      console.log('mkdir', path);
      includePaths.push(path);
      mod.FS.mkdirTree(`/src/${path}`);
    }

    for (const path in this.includes) {
      console.log('include', path);
      mod.FS.writeFile(`/src/${path}`, this.includes[path]);
    }

    const args = [
      '-g',
      '-I/src/user',
      '-I/src/files',
      ...includePaths.map((path) => `-I/src/${path}`),
      `-alh=/src/${fileName}.lst`,
      '-o',
      `/src/${fileName}.o`,
      `/src/${fileName}`,
    ];
    if (this.verbose) {
      args.unshift('--warn');
    }

    let code = 0;
    try {
      code = await mod.callMain(args);
    } catch (e) {
      this.errors.push({ source: 'as', message: e.message });
    }
    if (this.errors.length) throw this.errors;
    if (code != 0) throw [{ source: 'as', message: `exit code ${code}` }];

    const obj = mod.FS.readFile(`/src/${fileName}.o`);
    if (this.verbose) console.log('as', 'obj', obj);
    const listing = mod.FS.readFile(`/src/${fileName}.lst`, { encoding: 'utf8' });
    if (this.verbose) console.log('as', 'list', listing);

    return { obj, listing };
  }

  /**
   * Link an object file into an ELF executable and generate a map file.
   *
   * @async
   * @param {string} fileName - Base filename to use for output files.
   * @param {Uint8Array} obj - Input object file bytes.
   * @returns {Promise<{elf: Uint8Array, map: string}>}
   *   - elf: Linked ELF binary bytes
   *   - map: Linker map with memory layout and symbol addresses
   */
  async ld(fileName, obj) {
    const mod = await GnuLdModule({
      ...this.defaultModule,
      printErr: (msg, ...args) => {
        this.defaultModule.printErr(msg, ...args);

        const regex = /^(?!.*warning:).*?(?:([\w\/\.\-]+):(\d+):)?/;

        const match = msg.match(regex);
        const [_, filename, lineNum] = match;
        this.errors.push({
          source: 'ld',
          filename,
          lineNum,
          message: msg,
        });
      },
    });

    mod.FS.mkdir('/src');
    mod.FS.writeFile(`/src/${fileName}.o`, obj);
    mod.FS.writeFile('/zeal8bit.ld', this.linker.script);

    const args = ['-o', `/src/${fileName}.elf`, `-Map=/src/${fileName}.map`, `/src/${fileName}.o`];

    if (this.org == '0x0000') {
      args.unshift('-T', '/zeal8bit.ld');
    } else {
      args.unshift('-Ttext', this.org);
    }

    if (this.verbose) {
      args.unshift('-verbose');
    }

    let code = 0;
    try {
      code = await mod.callMain(args);
    } catch (e) {
      this.errors.push({ source: 'ld', message: e.message });
    }
    if (this.errors.length) throw this.errors;
    if (code != 0) throw [{ source: 'ld', message: `exit code ${code}` }];

    const elf = mod.FS.readFile(`/src/${fileName}.elf`);
    if (this.verbose) console.log('ld', 'elf', elf);
    const map = mod.FS.readFile(`/src/${fileName}.map`, { encoding: 'utf8' });
    if (this.verbose) console.log('ld', 'map', map);

    return { elf, map };
  }

  /**
   * Convert an ELF file into a raw binary image using objcopy.
   *
   * @async
   * @param {string} fileName - Base filename to use for output files.
   * @param {Uint8Array} elf - Input ELF file bytes.
   * @returns {Promise<{bin: Uint8Array}>}
   *   - bin: Extracted raw binary image
   */
  async objcopy(fileName, elf) {
    const mod = await GnuObjCopyModule({
      ...this.defaultModule,
      printErr: (msg, ...args) => {
        this.defaultModule.printErr(msg, ...args);
        this.errors.push({ source: 'objcopy', message: msg });
      },
    });

    mod.FS.mkdir('/src');
    mod.FS.writeFile(`/src/${fileName}.elf`, elf);
    const args = ['-O', 'binary', `/src/${fileName}.elf`, `/src/${fileName}.bin`];
    if (this.verbose) {
      args.unshift('--verbose');
    }

    let code = 0;
    try {
      code = await mod.callMain(args);
    } catch (e) {
      this.errors.push({ source: 'objcopy', message: e.message });
    }
    if (this.errors.length) throw this.errors;
    if (code != 0) throw [{ source: 'objcopy', message: `exit code ${code}` }];

    const bin = mod.FS.readFile(`/src/${fileName}.bin`);
    if (this.verbose) console.log('objcopy', 'bin', bin);
    return { bin };
  }

  /**
   * High-level helper: assemble, link, and objcopy in one step.
   *
   * @async
   * @param {string} fileName - Base filename to use for output files.
   * @param {string} text - Assembly source code.
   * @returns {Promise<{obj: Uint8Array, listing: string, elf: Uint8Array, map: string, bin: Uint8Array}>}
   *   - obj: Object file bytes
   *   - listing: Assembly listing text
   *   - elf: ELF binary bytes
   *   - map: Linker map
   *   - bin: Raw binary image
   */
  async execute(fileName, text, args = {}) {
    const { includes, org = '0x0000' } = args;
    this.includes = includes || {};
    this.org = org;

    const linkerScript = fetch('wasm/gnu-as/zeal8bit.ld')
      .then((response) => (response.ok ? response.text() : null))
      .then((script) => {
        this.linker.script = script;
      });

    const { obj, listing } = await this.as(fileName, text);
    const { elf, map } = await this.ld(fileName, obj);
    const { bin } = await this.objcopy(fileName, elf);

    if (this.errors.length) throw this.errors;

    return { obj, listing, elf, map, bin };
  }
}
