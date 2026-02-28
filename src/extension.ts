import * as vscode from "vscode";

interface JavaParseResult {
    packageName: string | null;
    className: string | null;
    methodName: string | null;
}

/**
 * 从 Java 源码中解析出 package、类名，以及光标所在行对应的方法名。
 */
function parseJavaAtPosition(document: vscode.TextDocument, cursorLine: number): JavaParseResult {
    const text = document.getText();
    const lines = text.split(/\r?\n/);

    let packageName: string | null = null;
    let className: string | null = null;
    const methodRanges: { name: string; startLine: number; endLine: number }[] = [];

    const packageRe = /^\s*package\s+([\w.]+)\s*;/;
    const classRe = /^\s*(?:public\s+)?(?:static\s+)?(?:final\s+)?(?:abstract\s+)?(?:class|enum|interface)\s+(\w+)/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const pkg = line.match(packageRe);
        if (pkg) {
            packageName = pkg[1];
        }
        const cls = line.match(classRe);
        if (cls) {
            className = cls[1];
        }
    }

    if (!className) {
        return { packageName, className: null, methodName: null };
    }

    let braceDepth = 0;
    let inClass = false;
    let classDepth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (classRe.test(line)) {
            inClass = true;
            classDepth = braceDepth;
        }

        if (!inClass) {
            if (line.includes("{")) {
                braceDepth += (line.match(/{/g) || []).length;
            }
            if (line.includes("}")) {
                braceDepth -= (line.match(/}/g) || []).length;
            }
            continue;
        }

        if (line.includes("{")) {
            braceDepth += (line.match(/{/g) || []).length;
        }
        if (line.includes("}")) {
            braceDepth -= (line.match(/}/g) || []).length;
        }

        const methodStartMatch = line.match(/\)\s*(?:throws\s+[\w.\s,]+)?\s*\{/);
        const opens = (line.match(/{/g) || []).length;
        if (methodStartMatch && braceDepth > classDepth) {
            const methodName = findMethodName(lines, i);
            if (methodName) {
                const depthAfterBrace = braceDepth + opens;
                const endLine = findMatchingBraceEnd(lines, i, depthAfterBrace);
                methodRanges.push({ name: methodName, startLine: i, endLine });
            }
        }
    }

    const currentMethod = methodRanges.find(
        (m) => cursorLine >= m.startLine && cursorLine <= m.endLine
    );

    return {
        packageName,
        className,
        methodName: currentMethod ? currentMethod.name : null,
    };
}

/**
 * 从方法体开始行向前查找方法名（最后一个 '(' 前的标识符）。
 */
function findMethodName(lines: string[], bodyStartLine: number): string | null {
    let sig = "";
    for (let i = bodyStartLine; i >= 0 && i >= bodyStartLine - 20; i--) {
        sig = lines[i] + " " + sig;
        const openParen = sig.lastIndexOf("(");
        if (openParen === -1) {
            continue;
        }
        const beforeParen = sig.substring(0, openParen);
        const idMatch = beforeParen.match(/(\w+)\s*$/);
        if (idMatch) {
            return idMatch[1];
        }
    }
    return null;
}

/**
 * 从方法体开始行（含 '{'）起，找到匹配的 '}' 所在行。
 * depthAtMethodStart 为遇到 '{' 后的括号深度。
 */
function findMatchingBraceEnd(
    lines: string[],
    bodyStartLine: number,
    depthAtMethodStart: number
): number {
    let depth = depthAtMethodStart;
    for (let i = bodyStartLine; i < lines.length; i++) {
        const line = lines[i];
        depth += (line.match(/{/g) || []).length;
        depth -= (line.match(/}/g) || []).length;
        if (depth < depthAtMethodStart) {
            return i;
        }
    }
    return lines.length - 1;
}

/**
 * 生成方法的完全限定引用：com.example.Class#methodName
 */
function toFqn(pkg: string | null, cls: string | null, method: string | null): string | null {
    if (!cls || !method) {
        return null;
    }
    const fullClass = pkg ? `${pkg}.${cls}` : cls;
    return `${fullClass}#${method}`;
}

export function activate(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand(
        "javaFqn.copyMethodReference",
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage("请先打开一个 Java 文件并将光标放在方法内。");
                return;
            }
            const doc = editor.document;
            if (doc.languageId !== "java") {
                vscode.window.showWarningMessage("当前文件不是 Java 文件。");
                return;
            }

            const cursorLine = editor.selection.active.line;
            const result = parseJavaAtPosition(doc, cursorLine);

            const fqn = toFqn(result.packageName, result.className, result.methodName);
            if (!fqn) {
                vscode.window.showWarningMessage(
                    "无法解析方法引用，请将光标放在某个方法体内再试。"
                );
                return;
            }

            await vscode.env.clipboard.writeText(fqn);
            vscode.window.showInformationMessage(`已复制: ${fqn}`);
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate(): void {}
