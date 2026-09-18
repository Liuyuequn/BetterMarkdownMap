# BetterMarkdownMap

BetterMarkdownMap 将 Markdown 内容转换成可交互的思维导图，并提供本地 CLI、HTML 渲染能力和 VS Code 扩展。

## 节点生成规则

只有以下 Markdown 结构会进入思维导图节点树：

- 一级至六级标题；
- 无序列表项；
- 有序列表项；
- 有序与无序列表的多层嵌套。

普通段落、表格、代码块、独占图片、引用块、分隔线和 frontmatter 标题不会生成节点。粗体、链接、行内代码和公式等内容如果位于标题或列表项内，只作为该节点的内部富文本显示。

## Workspace 包

- `bettermarkdownmap-common`：共享类型和工具函数。
- `bettermarkdownmap-html-parser`：将 Markdown 渲染结果转换成受限节点树。
- `bettermarkdownmap-lib`：完成 Markdown 解析和数据转换。
- `bettermarkdownmap-view`：在浏览器中渲染并控制 SVG 思维导图。
- `bettermarkdownmap-toolbar`：提供预览控制按钮。
- `bettermarkdownmap-render`：生成自包含 HTML。
- `bettermarkdownmap-cli`：提供命令行生成和本地实时预览。
- `bettermarkdownmap-autoloader`：在已有页面中初始化思维导图。
- `bettermarkdownmap-vscode`：提供本地 VS Code 扩展。

`bettermarkdownmap-lib` 负责数据转换，`bettermarkdownmap-view` 负责浏览器渲染，`bettermarkdownmap-cli` 和 `bettermarkdownmap-vscode` 在二者之上提供具体使用入口。

## 本地开发

需要 Node.js 22 或更高版本以及 pnpm。

```sh
pnpm install
pnpm build
pnpm test
```

如需生成本地 API 文档：

```sh
pnpm build:docs
```

## VS Code 扩展

生成可手动安装的 VSIX：

```sh
pnpm --filter bettermarkdownmap-vscode run package:vsix
```

在 VS Code 中选择“扩展：从 VSIX 安装”，安装仓库根目录生成的 `BetterMarkdownMap-1.0.0.vsix`。打开 Markdown 文件后，点击编辑器标题栏中的思维导图图标，或执行“BetterMarkdownMap: 思维导图”。预览会跟随编辑内容和当前 Markdown 编辑器实时更新，所有运行资源均包含在扩展中。

## CLI

单独构建 CLI：

```sh
pnpm --filter bettermarkdownmap-cli run build
```

生成思维导图 HTML：

```sh
node packages/bettermarkdownmap-cli/bin/cli.js input.md --no-open
```

CLI 生成的 HTML 会内嵌本地资源，不依赖外部 CDN。

## Autoloader

Autoloader 用于在已有 HTML 页面中初始化 `.bettermarkdownmap` 元素。启动前必须从本地构建产物加载 BetterMarkdownMap 运行时和可选工具栏资源；也可以通过 `baseJs`、`baseCss` 和 `provider` 指定本地资源路径。

## 工具栏

默认按钮依次为：放大、缩小、适应窗口、层级、递归折叠。层级按钮按“根节点＋一级节点”开始逐级展开，全部展开后再次点击会回到一级状态。手动展开节点后，视图会自动适应窗口。

```ts
import { Toolbar } from 'bettermarkdownmap-toolbar';

const { el } = Toolbar.create(mm);
el.style.position = 'absolute';
el.style.right = '20px';
el.style.bottom = '20px';
container.append(el);
```

## SVG 结构与样式

渲染结果的主要结构如下：

```html
<svg class="bettermarkdownmap">
  <style>...</style>
  <g>
    <g class="bettermarkdownmap-highlight">...</g>
    <path class="bettermarkdownmap-link" data-depth="..." data-path="..." />
    <g class="bettermarkdownmap-node" data-depth="..." data-path="...">
      <line />
      <circle />
      <foreignObject class="bettermarkdownmap-foreign">...</foreignObject>
    </g>
  </g>
</svg>
```

连线使用 `.bettermarkdownmap-link`，节点组使用 `.bettermarkdownmap-node`。`data-depth` 和 `data-path` 可用于按层级或节点路径覆盖样式，例如：

```css
.bettermarkdownmap-link[data-depth='2'],
.bettermarkdownmap-node[data-depth='2'] > line,
.bettermarkdownmap-node[data-depth='2'] > circle {
  stroke: red;
}
```
