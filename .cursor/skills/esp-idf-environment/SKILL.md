---
name: esp-idf-environment
description: Loads the ESP-IDF PowerShell environment so idf.py and the toolchain are on PATH. Use when idf.py is not found, when building or flashing ESP-IDF projects on Windows, or when the user asks how to run ESP-IDF commands.
---

# ESP-IDF Environment (Windows)

## When to Apply

- `idf.py` or other IDF commands are not found in the shell
- User wants to build, flash, or run ESP-IDF in a terminal
- Build/documentation says to use idf.py and the shell has no ESP-IDF env

## Load the Environment

On Windows with ESP-IDF (e.g. v5.5.3) installed via Espressif installer, the toolchain and `idf.py` are not on PATH until the environment is loaded.

**In PowerShell**, run the profile for your IDF version before any `idf.py` commands:

```powershell
. "C:\Espressif\tools\Microsoft.v5.5.3.PowerShell_profile.ps1"
```

Then run IDF commands in the **same shell** (or in a new shell started after loading):

```powershell
idf.py set-target esp32s3
idf.py build
idf.py -p PORT flash monitor
```

## In a Single Invocation

When running build/validation from a script or Cursor, source the profile and then run idf.py in one go:

```powershell
. "C:\Espressif\tools\Microsoft.v5.5.3.PowerShell_profile.ps1"; Set-Location "path/to/project"; idf.py build
```

Use the project’s actual path instead of `path/to/project` if different.

## Other Versions

If the project uses another ESP-IDF version, the profile path may change (e.g. `Microsoft.v5.4.PowerShell_profile.ps1`). Check under `C:\Espressif\tools\` for the matching profile name.

## Do Not

- Use `&&` in PowerShell to chain commands; use `;` instead.
- Assume `idf.py` is available without loading the profile in that shell first.
