import re

with open(r'frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove handleToggleDevMode
code = re.sub(r'  // Toggle Dev Mode.*?  }\n\n', '', code, flags=re.DOTALL)

# Remove the DEV MODE block in handleCreateEscrow
code = re.sub(r'    // --- DEV MODE: simulate escrow creation locally ---.*?    }\n\n', '', code, flags=re.DOTALL)

# Remove the DEV MODE block in handleSubmitEvidence
code = re.sub(r'    // --- DEV MODE: simulate evidence submission locally ---.*?    }\n\n', '', code, flags=re.DOTALL)

# Remove the DEV MODE block in handleResolveDispute
code = re.sub(r'    // --- DEV MODE: simulate AI judge resolution locally ---.*?    }\n\n', '', code, flags=re.DOTALL)

# Remove Dev Mode UI toggle in nav
code = re.sub(r'            \{\/\* Dev Mode Toggle \*\/\}.*?            </div>\n\n', '', code, flags=re.DOTALL)

# Remove Dev Mode from wallet modal
code = re.sub(r'            <div className="wallet-option" onClick=\{handleToggleDevMode\}.*?            </div>\n\n', '', code, flags=re.DOTALL)

# Replace the [devMode, setDevMode] = useState(false) with just devMode = false for simplicity, or remove it.
code = re.sub(r'  const \[devMode, setDevMode\] = useState\(false\)\n', '  const devMode = false;\n', code)

with open(r'frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
