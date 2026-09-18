import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  Transformer,
  type IBetterMarkdownMapJSONOptions,
} from 'bettermarkdownmap-lib';

type PreviewMessage =
  | {
      type: 'render';
      root: ReturnType<Transformer['transform']>['root'];
      options?: Partial<IBetterMarkdownMapJSONOptions>;
      fileName: string;
    }
  | { type: 'error'; message: string };

class PreviewController implements vscode.Disposable {
  private readonly transformer = new Transformer();

  private readonly disposables: vscode.Disposable[] = [];

  private panel: vscode.WebviewPanel | undefined;

  private sourceDocument: vscode.TextDocument | undefined;

  private webviewReady = false;

  private updateTimer: NodeJS.Timeout | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.disposables.push(
      vscode.commands.registerCommand('bettermarkdownmap.openPreview', () =>
        this.openPreview(),
      ),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (this.isSource(event.document)) this.scheduleUpdate();
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (this.panel && editor && this.isMarkdown(editor.document)) {
          this.sourceDocument = editor.document;
          this.updateTitle();
          this.scheduleUpdate();
        }
      }),
    );
  }

  private isMarkdown(document: vscode.TextDocument): boolean {
    return (
      document.languageId === 'markdown' ||
      document.fileName.toLowerCase().endsWith('.md') ||
      document.fileName.toLowerCase().endsWith('.markdown')
    );
  }

  private isSource(document: vscode.TextDocument): boolean {
    return document.uri.toString() === this.sourceDocument?.uri.toString();
  }

  private async openPreview(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !this.isMarkdown(editor.document)) {
      await vscode.window.showWarningMessage(
        '请先打开一个 Markdown 文件，再启动 BetterMarkdownMap 预览。',
      );
      return;
    }

    this.sourceDocument = editor.document;
    if (!this.panel) this.createPanel();
    this.panel?.reveal(vscode.ViewColumn.Beside, true);
    this.updateTitle();
    await this.updatePreview();
  }

  private createPanel(): void {
    const distUri = vscode.Uri.joinPath(this.context.extensionUri, 'dist');
    this.panel = vscode.window.createWebviewPanel(
      'bettermarkdownmap.preview',
      'BetterMarkdownMap',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [distUri],
      },
    );
    this.panel.webview.html = this.getWebviewHtml(this.panel.webview, distUri);
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
        this.sourceDocument = undefined;
        this.webviewReady = false;
        if (this.updateTimer) clearTimeout(this.updateTimer);
      },
      undefined,
      this.disposables,
    );
    this.panel.webview.onDidReceiveMessage(
      (message: { type?: string }) => {
        if (message.type === 'ready') {
          this.webviewReady = true;
          void this.updatePreview();
        }
      },
      undefined,
      this.disposables,
    );
  }

  private updateTitle(): void {
    if (!this.panel || !this.sourceDocument) return;
    this.panel.title = `BetterMarkdownMap: ${path.basename(
      this.sourceDocument.fileName,
    )}`;
  }

  private scheduleUpdate(): void {
    if (this.updateTimer) clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      this.updateTimer = undefined;
      void this.updatePreview();
    }, 120);
  }

  private async updatePreview(): Promise<void> {
    if (!this.panel || !this.sourceDocument || !this.webviewReady) return;
    let message: PreviewMessage;
    try {
      const result = this.transformer.transform(this.sourceDocument.getText());
      message = {
        type: 'render',
        root: result.root,
        options: result.frontmatter?.bettermarkdownmap,
        fileName: path.basename(this.sourceDocument.fileName),
      };
    } catch (error) {
      message = {
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
    await this.panel.webview.postMessage(message);
  }

  private getWebviewHtml(webview: vscode.Webview, distUri: vscode.Uri): string {
    const nonce = createNonce();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'webview.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'assets', 'style.css'),
    );
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${styleUri}">
  <title>BetterMarkdownMap</title>
</head>
<body>
  <main id="app">
    <svg id="mindmap"></svg>
    <div id="toolbar"></div>
    <div id="error" role="alert" hidden></div>
  </main>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  dispose(): void {
    if (this.updateTimer) clearTimeout(this.updateTimer);
    this.panel?.dispose();
    this.disposables.splice(0).forEach((item) => item.dispose());
  }
}

function createNonce(): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () =>
    alphabet.charAt(Math.floor(Math.random() * alphabet.length)),
  ).join('');
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(new PreviewController(context));
}

export function deactivate(): void {}
