import { parse } from 'yaml';
import { IBetterMarkdownMapJSONOptions, ITransformHooks } from '../../types';
import { definePlugin } from '../base';

const name = 'frontmatter';

export default definePlugin({
  name,
  transform(transformHooks: ITransformHooks) {
    transformHooks.beforeParse.tap((_md, context) => {
      const { content } = context;
      if (!/^---\r?\n/.test(content)) return;
      const match = /\n---\r?\n/.exec(content);
      if (!match) return;
      const raw = content.slice(4, match.index).trimEnd();
      let frontmatter: typeof context.frontmatter;
      try {
        frontmatter = parse(raw.replace(/\r?\n|\r/g, '\n'));
        if (frontmatter?.bettermarkdownmap) {
          frontmatter.bettermarkdownmap = normalizeBetterMarkdownMapJsonOptions(
            frontmatter.bettermarkdownmap,
          );
        }
      } catch {
        return;
      }
      context.frontmatter = frontmatter;
      context.frontmatterInfo = {
        lines: content.slice(0, match.index).split('\n').length + 1,
        offset: match.index + match[0].length,
      };
    });
    return {};
  },
});

function normalizeBetterMarkdownMapJsonOptions(
  options?: Partial<IBetterMarkdownMapJSONOptions>,
) {
  if (!options) return;
  ['color', 'extraJs', 'extraCss'].forEach((key) => {
    if (options[key] != null) options[key] = normalizeStringArray(options[key]);
  });
  ['duration', 'maxWidth', 'initialExpandLevel'].forEach((key) => {
    if (options[key] != null) options[key] = normalizeNumber(options[key]);
  });
  return options;
}

function normalizeStringArray(value: string | string[]) {
  let result: string[] | undefined;
  if (typeof value === 'string') result = [value];
  else if (Array.isArray(value))
    result = value.filter((item) => item && typeof item === 'string');
  return result?.length ? result : undefined;
}

function normalizeNumber(value: number | string) {
  if (isNaN(+value)) return;
  return +value;
}
