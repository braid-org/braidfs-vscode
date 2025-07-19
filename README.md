# braidfs-vscode

BraidFS extension for VS Code.

If you have BraidFS running,
and you open a file in the `~/http` directory,
this extension will allow editing of the file without conflicts
(when a file is saved,
the edits will be merged with any edits that happened externally while the file was being edited locally).

## Installation

### Method 1: Install from VSIX

1. Download the latest `.vsix` file from the [Releases page](https://github.com/braid-org/braidfs-vscode/releases)
2. Open VS Code
3. Press `Ctrl+Shift+P` / `Cmd+Shift+P` to open the Command Palette
4. Type "Install from VSIX" and select `Extensions: Install from VSIX...`
5. Select the downloaded `.vsix` file

**Via command line:**
```bash
code --install-extension braidfs-vscode-0.0.2.vsix
```

### Method 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/braid-org/braidfs-vscode.git
cd braidfs-vscode

# Install dependencies
npm install

# Package the extension
vsce package

# Install the generated .vsix file
code --install-extension braidfs-vscode-0.0.2.vsix
```

## Usage

1. Ensure BraidFS is running, and sync a file with it.
2. Open the synced file in VS Code.
3. Edit the file locally, and before saving, edit it remotely, then save local changes and see them merge with remote changes.
