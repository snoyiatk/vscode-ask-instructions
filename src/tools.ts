import * as fs from 'node:fs';
import * as os from 'node:os';
import path from 'path';
import * as vscode from 'vscode';

export function registerChatTools(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.lm.registerTool('ask_follow_up_instructions', new AskFollowupInstructionsTool(context)));
}

interface IFollowUp {
	suggest: string;
}

interface IAskFollowupInstructions {
	prompt: string;
	follow_up?: IFollowUp[];
}

function waitForFileChange(filePath: string) {
	return new Promise((resolve, reject) => {
		let watcher: fs.FSWatcher;
		try {
			watcher = fs.watch(filePath, (eventType, _filename) => {
				watcher.close(); // Stop watching after the first change
				resolve({ eventType });
			});

			// Handle potential errors during watching
			watcher.on('error', (err) => {
				console.error(`Error watching file: ${err.message}`);
				reject(err);
			});

		} catch (error) {
			reject(error); // Handle errors during fs.watch setup
		}
	});
}

export class AskFollowupInstructionsTool implements vscode.LanguageModelTool<IAskFollowupInstructions> {
	private context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	async invoke(_options: vscode.LanguageModelToolInvocationOptions<IAskFollowupInstructions>,
		_token: vscode.CancellationToken) {
		let result = null;
		try {
			const _params = _options.input as IAskFollowupInstructions;
			// createQuickPick
			// showQuickPick
			// createInputBox
			result = await vscode.window.showInputBox({
				ignoreFocusOut: true,
				placeHolder: "instructions or file:PATH",
				prompt: _params.prompt,
				title: "Enter follow-up instructions. Use file:PATH to specify instructions from path",
				// value: "instructions or file:PATH"
			}, _token);
			let filePath = null;
			const tempFile = result ? false : true;
			if (!result) {
				const tmpFileName = `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.md`;
				result = `file:${path.join(os.tmpdir(), tmpFileName)}`;
			}
			if (result.startsWith("file:") || result.startsWith("/")) {
				filePath =  result.replace("file:", "");
				const uri = vscode.Uri.file(filePath);
				if (!fs.existsSync(filePath)) {
					// vscode.workspace.fs.writeFile(uri, Buffer.from("## Task description\n"));
					const defaultSuggestion = _params.follow_up?.map(a=>a.suggest).join("\n") || "";
					fs.writeFileSync(filePath, `## Task description\n${_params.prompt}\n${defaultSuggestion}`);
				}
				try {
					const document = await vscode.workspace.openTextDocument(uri);
					const _editor = await vscode.window.showTextDocument(document);
					await waitForFileChange(filePath);
					// const fileContent = vscode.workspace.fs.readFile(uri);
					// vscode.window.tabGroups.close(tabs[index]);
					const fileContent = fs.readFileSync(filePath, "utf-8");
					result = fileContent;
				} finally {
					// Clean up temporary file
					if (tempFile && fs.existsSync(filePath)) {
						try {
							fs.unlinkSync(filePath);
						} catch (cleanupError) {
							console.error(`Failed to delete temporary file: ${cleanupError}`);
						}
					}
				}
			}
		} catch (e) {
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart((e as Error).message)]);
		}
		return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(result || "")]);
	}

	async prepareInvocation?(_options: vscode.LanguageModelToolInvocationPrepareOptions<IAskFollowupInstructions>,
		_token: vscode.CancellationToken) {
		return {
			invocationMessage: 'Please enter follow-up instructions',
			confirmationMessages: {
				title: "Confirm",
				message: new vscode.MarkdownString(
					`Run the ask_follow_up_instructions tools?`
				)
			},
		}
	}

}
