# Java 方法引用复制 (java-fqn)

在 Cursor / VS Code 中，当光标放在 Java 方法体内时，可通过右键菜单**复制方法引用 (FQN)**，将完全限定方法引用写入剪贴板。

## 输出格式

```
com.sensorsdata.cloudatlas.common.utils.BusinessThreadStackTraceLoggerTest#setUp
```

即：`包名.类名#方法名`。

## 使用方法

1. 在编辑器中打开任意 Java 文件。
2. 将光标移动到**要复制引用的方法体内**（任意一行即可）。
3. 右键选择 **「复制方法引用 (FQN)」**。
4. 引用已写入剪贴板，可粘贴到任意位置。

## 安装（本地开发/调试）

1. 克隆或下载本仓库到本地。
2. 在项目根目录执行：
   ```bash
   npm install
   npm run compile
   ```
3. 在 Cursor/VS Code 中按 `F5` 或通过「运行和调试」→「Launch Extension」启动扩展开发主机。
4. 在新窗口中打开一个 Java 项目，在方法内右键即可看到「复制方法引用 (FQN)」。

## 打包为 VSIX（可选）

```bash
npm install -g @vscode/vsce
vsce package
```

生成 `.vsix` 后，在 Cursor/VS Code 中通过「扩展」→「...」→「从 VSIX 安装」进行安装。

## 说明

- 仅识别**顶层类**中的方法；嵌套类当前按同一类处理。
- 构造函数会以类名作为“方法名”输出（例如 `com.example.Foo#Foo`）。
- 若光标不在任何方法体内，会提示「无法解析方法引用」。
