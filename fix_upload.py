import re

# ============================================================
# FIX 1: app.js — change let selectedFile to window.selectedFile
# ============================================================
with open('app.js', 'r', encoding='utf-8') as f:
    app = f.read()

# Fix declaration: let selectedFile = null  ->  window.selectedFile = null
app = app.replace(
    'let selectedFile = null; // Store file reference globally so it persists after dropzone HTML changes',
    'window.selectedFile = null; // Store file reference globally (window so inline scripts can access it)'
)

# Fix assignment in handleFileSelect: selectedFile = file  ->  window.selectedFile = file
app = app.replace(
    'selectedFile = file; // Save globally before dropzone HTML is replaced',
    'window.selectedFile = file; // Save on window so inline HTML scripts can access it'
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app)
print('app.js fixed')

# ============================================================
# FIX 2: index.html — resetDropzone clear + submitNewDocReal use window.selectedFile
# ============================================================
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix resetDropzone to clear window.selectedFile
html = html.replace(
    'window.selectedFile = null; // Clear the stored file reference',
    'window.selectedFile = null; // Clear file after upload'
)

# Ensure submitNewDocReal uses window.selectedFile (already patched, just verify)
if 'window.selectedFile || document.getElementById' in html:
    print('index.html submitNewDocReal already uses window.selectedFile - OK')
else:
    # Patch it
    html = html.replace(
        "const file      = fileInput?.files?.[0];",
        "const file      = window.selectedFile || fileInput?.files?.[0];"
    )
    print('index.html submitNewDocReal patched')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('index.html fixed')

print('\nAll fixes applied successfully!')
