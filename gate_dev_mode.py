import re

with open(r'frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Gate the Dev Mode simulation blocks
code = code.replace(
    '    // --- DEV MODE: simulate escrow creation locally ---\n    if (devMode) {',
    '    // --- DEV MODE: simulate escrow creation locally ---\n    if (import.meta.env.DEV && devMode) {'
)

code = code.replace(
    '    // --- DEV MODE: simulate evidence submission locally ---\n    if (devMode) {',
    '    // --- DEV MODE: simulate evidence submission locally ---\n    if (import.meta.env.DEV && devMode) {'
)

code = code.replace(
    '    // --- DEV MODE: simulate AI judge resolution locally ---\n    if (devMode) {',
    '    // --- DEV MODE: simulate AI judge resolution locally ---\n    if (import.meta.env.DEV && devMode) {'
)

# 2. Gate the UI toggles
code = re.sub(
    r'(            \{\/\* Dev Mode Toggle \*\/\}\n            <div \n              onClick=\{handleToggleDevMode\}.*?            <\/div>)',
    r'            {import.meta.env.DEV && (\n\1\n            )}',
    code,
    flags=re.DOTALL
)

code = re.sub(
    r'(            <div className=\"wallet-option\" onClick=\{handleToggleDevMode\}.*?            <\/div>)',
    r'            {import.meta.env.DEV && (\n\1\n            )}',
    code,
    flags=re.DOTALL
)

with open(r'frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
