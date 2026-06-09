function switchTab(name, el) {
  // Hide all panels
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

  // Show selected panel
  document.getElementById('panel-' + name).classList.add('active');
  el.classList.add('active');
}