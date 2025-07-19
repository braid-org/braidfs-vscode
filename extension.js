const vscode = require("vscode")
const { execSync, spawn } = require("child_process")

let documents
let braidfsPath
let statusBarItem

function activate(context) {
    documents = new Map()
    braidfsPath = execSync(`which braidfs`, { encoding: "utf8" }).trim()

    // Create status bar item
    context.subscriptions.push(statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100))

    // Register custom save command
    context.subscriptions.push(vscode.commands.registerCommand("myExtension.customSave", async () => {
        const editor = vscode.window.activeTextEditor
        const document = editor?.document
        const filePath = document?.uri.fsPath
        const docInfo = documents.get(filePath)
        const ver = await docInfo?.editing

        if (typeof ver === 'string') {
            // This is a BraidFS-managed file, handle save with BraidFS
            try {
                await new Promise((resolve, reject) => {
                    const filePath = document.uri.fsPath
                    const process = spawn(braidfsPath, ["edited", filePath, ver], {
                        stdio: ["pipe", "pipe", "pipe"],
                    })

                    process.stdin.write(document.getText())
                    process.stdin.end()

                    let stderr = ""
                    process.stderr.on("data", (data) => {
                        stderr += data.toString()
                    })

                    process.on("close", (code) => {
                        if (code === 0) {
                            resolve()
                        } else {
                            reject(new Error(`BraidFS exited with code ${code}: ${stderr}`))
                        }
                    })
                })

                // revert to the version saved by BraidFS
                vscode.commands.executeCommand("workbench.action.files.revert")
            } catch (error) {
                vscode.window.showErrorMessage(`BraidFS save error: ${error.message}`)
            }
        } else {
            // Not a BraidFS-managed file or no version found, use normal save
            vscode.commands.executeCommand("workbench.action.files.save")
        }
    }))

    // Track document changes to detect when editing starts/stops
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
            var document = event.document
            var filePath = document.uri.fsPath
            var docInfo = documents.get(filePath)
            if (docInfo) {
                if (document.isDirty && !docInfo.editing) {
                    var text = docInfo.cache
                    docInfo.editing = new Promise(done => {
                        var process = spawn(braidfsPath, ["editing", filePath],
                            { stdio: ["pipe", "pipe", "pipe"] })
                        let stdout = []
                        process.stdout.on("data", x => stdout.push(x))
                        process.on("close", exit_code => {
                            done(exit_code === 0 ? Buffer.concat(stdout).toString() : null)
                            updateStatusBar()
                        })
                        process.stdin.write(text)
                        process.stdin.end()
                    })
                } else if (!document.isDirty && docInfo.editing) {
                    delete docInfo.editing
                    vscode.commands.executeCommand("workbench.action.files.revert")
                    docInfo.cache = document.getText()
                }
                updateStatusBar()
            }
        })
    )

    // Track document open to init cache
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(doc => {
            if (isInHttpDirectory(doc.uri.fsPath)) {
                documents.set(doc.uri.fsPath, {
                    cache: doc.getText()
                })
            }
        })
    );

    // Track document close to clean up
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument((document) => {
            documents.delete(document.uri.fsPath)
            updateStatusBar()
        })
    )

    // Update status bar when active editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(() => {
            updateStatusBar()
        })
    )

    // Handle documents opened and possibly edited before the extension loads
    for (var doc of vscode.workspace.textDocuments) {
        if (isInHttpDirectory(doc.uri.fsPath)) {
            documents.set(doc.uri.fsPath, {
                editing: doc.isDirty ? null : undefined,
                cache: doc.getText()
            })
        }
    }
    updateStatusBar()
}

function isInHttpDirectory(filePath) {
    var httpDir = require("path").join(require("os").homedir(), "http")
    return filePath && filePath.startsWith(httpDir) && !filePath.includes("#")
}

async function updateStatusBar() {
    var path = vscode.window.activeTextEditor?.document.uri.fsPath
    if (isInHttpDirectory(path)) {
        const docInfo = documents.get(path)
        if (docInfo?.editing !== undefined) {
            var ver = await Promise.race([docInfo.editing, 'waiting..'])
            statusBarItem.text = typeof ver === 'string' ?
                "$(edit) BraidFS Editing: " + ver :
                "$(edit) BraidFS not syncing!"
            statusBarItem.show()
            return
        }
    }
    statusBarItem.hide()
}

function deactivate() {
    if (statusBarItem) statusBarItem.dispose()
}

module.exports = {
    activate,
    deactivate,
}
