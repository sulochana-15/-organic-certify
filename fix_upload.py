import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix resetDropzone to also clear selectedFile global
old = """  function resetDropzone() {
    const dropzone = document.getElementById('uploadDropzone');
    if (dropzone) dropzone.innerHTML = `
      <span class="dropzone-icon">\u2601\ufe0f</span>
      <p>Click to browse or drag and drop your file here</p>
      <small>Supports PDF, JPG, PNG, XLSX \u2014 Max 10MB</small>
      <input type="file" id="fileInput" style="display:none" onchange="handleFileSelect(event)" />`;\n  }"""

new = """  function resetDropzone() {
    window.selectedFile = null; // Clear the stored file reference
    const dropzone = document.getElementById('uploadDropzone');
    if (dropzone) dropzone.innerHTML =
      '<span class="dropzone-icon">\u2601\ufe0f</span>' +
      '<p>Click to browse or drag and drop your file here</p>' +
      '<small>Supports PDF, JPG, PNG, XLSX \u2014 Max 10MB</small>' +
      '<input type="file" id="fileInput" style="display:none" onchange="handleFileSelect(event)" />';\n  }"""

if old in content:
    content = content.replace(old, new)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: resetDropzone patched')
else:
    print('NOT FOUND - looking for resetDropzone...')
    idx = content.find('resetDropzone')
    print(repr(content[idx:idx+400]))
