// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ChatPanel } from './chatPanel';
import { OllamaService, DEEPSEEK_MODELS, DeepseekModel } from './ollamaService';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	const ollamaService = new OllamaService();

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "deepseek-vscode" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('deepseek-vscode.startChat', async () => {
		try {
			// Ask user to select model
			const selectedModel = await vscode.window.showQuickPick(DEEPSEEK_MODELS, {
				placeHolder: 'Select DeepSeek model variant',
				title: 'Choose DeepSeek Model'
			});

			if (!selectedModel) {
				return; // User cancelled
			}

			ollamaService.setModel(selectedModel as DeepseekModel);

			const isModelAvailable = await ollamaService.checkModelAvailability();
			if (!isModelAvailable) {
				const result = await vscode.window.showErrorMessage(
					`${selectedModel} model is not available. Would you like to pull it from Ollama?`,
					'Yes', 'No'
				);

				if (result === 'Yes') {
					const terminal = vscode.window.createTerminal('Ollama');
					terminal.sendText(`ollama pull ${selectedModel}`);
					terminal.show();
					vscode.window.showInformationMessage(`Pulling ${selectedModel} model. Please try again after the download is complete.`);
					return;
				}
				return;
			}

			ChatPanel.createOrShow(ollamaService);
		} catch (error) {
			vscode.window.showErrorMessage('Failed to connect to Ollama. Please make sure Ollama is running.');
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
