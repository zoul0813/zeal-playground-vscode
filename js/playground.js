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

async function download_binary() {
  const bytes = await assemble();
  const data = new Uint8Array(bytes);
  const blob = new Blob([data], { type: 'application/octen-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  const fileName = editor.fileName.split('/').slice(-1).join('').split('.').slice(0, -1).join('.') + '.bin';
  a.download = fileName;
  document.body.append(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('document', 'load');
  fetch('sprites_move.bin')
    .then(async (response) => {
      if (!response.ok) throw 'invalid response';
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    })
    .then(async (data) => {
      console.log(data);
      code_run(data);
    })
    .then(() => {
      document.body.classList.remove('loading');
    })
    .catch((e) => {
      console.error('ERROR', e);
    });
});
