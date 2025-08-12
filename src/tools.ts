import * as fs from 'node:fs';
import path from 'path';
import * as vscode from 'vscode';

export function registerChatTools(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.lm.registerTool('ask_follow_up_instructions', new AskFollowupInstructionsTool()));
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
			if (!result) {
				result = "file:task.md";
			}
			if (result.startsWith("file:") || result.startsWith("/")) {
				const fName = result.replace("file:","");
				const fPath = path.join(vscode.workspace.rootPath || "", ".tasks", fName);
				if (!fs.existsSync(fPath)) {
					fs.writeFileSync(fPath, "## Task description\n");
				}
				const uri = vscode.Uri.file(fPath);
				vscode.workspace.openTextDocument(uri);
				await waitForFileChange(fPath);
				const fileContent = fs.readFileSync(fPath, "utf-8");
				result = fileContent;
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
