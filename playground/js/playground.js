const viewport = document.getElementById('viewport');
const emulator = document.getElementById('emulator');
const editor = {
  fileName: 'file.bin',
};

async function code_run(bytes) {
  // const bytes = await assemble();
  console.log(bytes);
  /* If we have some bytes, load them to the VFS */
  const data = new Uint8Array(bytes);

  emulator.reload(data);
}

async function code_stop() {
  emulator.stop();
}
