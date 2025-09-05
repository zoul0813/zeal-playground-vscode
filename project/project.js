const vscode = acquireVsCodeApi();
console.log('wtf');
function create() {
  const name = document.getElementById('name');
  const template = document.getElementById('template');
  const type = document.getElementById('type');
  const destination = document.getElementById('destination');

  vscode.postMessage({
    command: 'create',
    name: name.value || name.getAttribute('placeholder'),
    template: template.value || template.getAttribute('placeholder'),
    type: type.value || type.getAttribute('placeholder'),
    destination: destination.value || destination.getAttribute('placeholder'),
  });
}
function cancel() {
  vscode.postMessage({ command: 'cancel' });
}

const bCreate = document.getElementById('btn-create');
bCreate.addEventListener('click', create);
const bCancel = document.getElementById('btn-cancel');
bCancel.addEventListener('click', cancel);

window.addEventListener('load', () => {
  const destination = document.getElementById('destination');
  if (destination) {
    destination.placeholder = window.projectRoot;
  }
});
