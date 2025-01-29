import * as vscode from 'vscode';
import { marked } from 'marked';
import { OllamaService, ChatMessage } from './ollamaService';
import hljs from 'highlight.js';

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _ollamaService: OllamaService;
    private _messages: ChatMessage[] = [];
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, ollamaService: OllamaService) {
        this._panel = panel;
        this._ollamaService = ollamaService;

        this._panel.webview.html = this._getWebviewContent();
        this._setWebviewMessageListener();

        // Panel kapatıldığında temizlik yap
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static async createOrShow(ollamaService: OllamaService) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'deepseekChat',
            'DeepSeek Chat',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, ollamaService);
    }

    public dispose() {
        ChatPanel.currentPanel = undefined;

        // Paneli temizle
        this._panel.dispose();

        // Diğer kaynakları temizle
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _setWebviewMessageListener() {
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'sendMessage':
                        await this._handleUserMessage(message.text);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private async _handleUserMessage(text: string) {
        const userMessage: ChatMessage = { role: 'user', content: text };
        this._messages.push(userMessage);
        this._updateChatView();

        try {
            const response = await this._ollamaService.chat(this._messages);
            const assistantMessage: ChatMessage = { role: 'assistant', content: response };
            this._messages.push(assistantMessage);
            this._updateChatView();
        } catch (error) {
            vscode.window.showErrorMessage('Failed to get response from DeepSeek model');
        }
    }

    private _updateChatView() {
        const renderer = new marked.Renderer();
        renderer.code = (code: string, language: string | undefined) => {
            const validLanguage = hljs.getLanguage(language || '') ? language : 'plaintext';
            const highlighted = validLanguage ? 
                hljs.highlight(code, { language: validLanguage }).value : 
                hljs.highlightAuto(code).value;
            return `<pre><code class="hljs ${validLanguage}">${highlighted}</code></pre>`;
        };

        marked.setOptions({ renderer });

        this._panel.webview.postMessage({
            command: 'updateChat',
            messages: this._messages.map(msg => ({
                ...msg,
                content: marked(msg.content)
            }))
        });
    }

    private _getWebviewContent() {
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/javascript.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/typescript.min.js"></script>
            <style>
                body {
                    padding: 0;
                    margin: 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                .chat-container {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    max-width: 900px;
                    margin: 0 auto;
                }
                .messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                }
                .message {
                    margin-bottom: 24px;
                    padding: 16px;
                    border-radius: 8px;
                    line-height: 1.5;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
                }
                .user {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    margin-left: 15%;
                }
                .assistant {
                    background-color: var(--vscode-sideBarSectionHeader-background);
                    color: var(--vscode-editor-foreground);
                    margin-right: 15%;
                    border: 1px solid var(--vscode-editor-lineHighlightBorder);
                }
                .input-container {
                    padding: 20px;
                    background-color: var(--vscode-editor-background);
                    border-top: 1px solid var(--vscode-editor-lineHighlightBorder);
                }
                #messageInput {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid var(--vscode-button-background);
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 8px;
                    resize: vertical;
                    font-size: 14px;
                    transition: border-color 0.3s ease;
                }
                #messageInput:focus {
                    outline: none;
                    border-color: var(--vscode-focusBorder);
                }
                pre {
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 16px;
                    border-radius: 6px;
                    overflow-x: auto;
                    margin: 12px 0;
                    border: 1px solid var(--vscode-editor-lineHighlightBorder);
                }
                code {
                    font-family: 'Fira Code', 'Consolas', 'Courier New', monospace;
                    font-size: 13px;
                }
                p {
                    margin: 8px 0;
                }
                .hljs {
                    background: var(--vscode-editor-background) !important;
                    padding: 0 !important;
                }
            </style>
        </head>
        <body>
            <div class="chat-container">
                <div class="messages" id="messages"></div>
                <div class="input-container">
                    <textarea id="messageInput" placeholder="Type your message... (Enter to send, Shift+Enter for new line)" rows="3"></textarea>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                const messagesContainer = document.getElementById('messages');
                const messageInput = document.getElementById('messageInput');

                messageInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const text = messageInput.value.trim();
                        if (text) {
                            vscode.postMessage({
                                command: 'sendMessage',
                                text: text
                            });
                            messageInput.value = '';
                        }
                    }
                });

                window.addEventListener('message', (event) => {
                    const message = event.data;
                    switch (message.command) {
                        case 'updateChat':
                            messagesContainer.innerHTML = message.messages
                                .map(msg => \`
                                    <div class="message \${msg.role}">
                                        <div>\${msg.content}</div>
                                    </div>
                                \`)
                                .join('');
                            
                            // Syntax highlighting için kod bloklarını işle
                            messagesContainer.querySelectorAll('pre code').forEach((block) => {
                                hljs.highlightElement(block);
                            });
                            
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
    }
} 