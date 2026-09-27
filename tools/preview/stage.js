const params = new URLSearchParams(location.search);
const frame = document.querySelector('#preview');
frame.src = '/extension/popup/popup.html?' + params.toString();
frame.style.width = (Number(params.get('width')) || 520) + 'px';
frame.style.height = (Number(params.get('height')) || 600) + 'px';
