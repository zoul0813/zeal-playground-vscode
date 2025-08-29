(() => {
  /* WebASM related */
  const emulator = document.getElementById('emulator');

  const controls = emulator.querySelector('.controls');
  const output = emulator.querySelector('.output');
  const canvas = emulator.querySelector('canvas');

  let instance = null;

  canvas.addEventListener('keydown', (e) => {
    /* Prevent the window from listening on events that are meant to be sent to the VM */
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  });

  canvas.addEventListener('wheel', (e) => {
    emulator.scrollLeft += e.deltaX;
    emulator.scrollTop += e.deltaY;
  });

  const bToggleFPS = emulator.querySelector('.toggle-fps');
  function setToggleFPS(show_fps) {
    log('warn')('show_fps', show_fps);
    if (show_fps) {
      bToggleFPS.textContent = 'Hide FPS';
    } else {
      bToggleFPS.textContent = 'Show FPS';
    }
  }

  bToggleFPS?.addEventListener('click', () => {
    console.log('toggle-fps');
    if (instance) {
      const show_fps = !!!instance.getValue(instance._show_fps, 'i8');
      instance.setValue(instance._show_fps, show_fps ? 1 : 0, 'i8');
      setToggleFPS(show_fps);
      localStorage.setItem('show_fps', show_fps ? 1 : 0);
    }
  });

  function log(prefix = '') {
    return (text, ...args) => {
      console.log(prefix, text, ...args);
      const line = document.createElement('div');
      line.classList.add('log-line', prefix);
      line.textContent = text + (args ? ' ' + args.join(' ') : '');
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    };
  }

  emulator.reload = (data) => {
    console.log('reloadEmulator', data);

    if (instance) {
      instance._zeal_exit();
      instance = null;
      setTimeout(() => {
        emulator.reload(data);
      }, 100);
      return;
    }

    output.innerHTML = '';
    const fileName = 'program.bin';
    let loadArg = '-u';
    switch (window.zeal8bitConfig?.uses) {
      case 'bare':
        loadArg = '-r';
        break;
      case 'zealos':
      default:
        loadArg = '-u';
        break;
    }
    const arguments = [loadArg, `/user/${fileName}`];
    console.log('emulator args', arguments);
    const defaultModule = {
      arguments,
      print: log('info'),
      printErr: log('error'),
      get canvas() {
        const canvas = document.getElementById('canvas');
        return canvas;
      },
      onRuntimeInitialized: function () {
        this.FS.mkdir('/user');
        this.FS.writeFile(`/user/${fileName}`, data);
      },
    };

    NativeModule(defaultModule).then((mod) => {
      instance = mod;

      const show_fps = !!parseInt(localStorage.getItem('show_fps') || 0);
      instance.setValue(instance._show_fps, show_fps, 'i8');
      setToggleFPS(show_fps);
      controls.classList.remove('hidden');
      output.classList.remove('hidden');
      output.scrollTop = output.scrollHeight;
    });
  };

  emulator.stop = () => {
    console.log('stop emulator');
    if (instance) {
      instance._zeal_exit();
    }
    instance = null;
    controls.classList.add('hidden');
    output.classList.add('hidden');
  };
})();
