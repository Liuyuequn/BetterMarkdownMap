import MarkdownIt from 'markdown-it';
import md_ins from 'markdown-it-ins';
import md_mark from 'markdown-it-mark';
import md_sub from 'markdown-it-sub';
import md_sup from 'markdown-it-sup';

const SELECTOR_ORDERED_ITEM = /^\s*(\d{1,9})[.)]/;

export function initializeMarkdownIt() {
  const md = MarkdownIt({
    html: true,
    breaks: true,
  });
  md.use(md_ins).use(md_mark).use(md_sub).use(md_sup);
  // Markdown only keeps the delimiter of an ordered list item (`1.` and `31.`
  // both end up with the markup `.`), while the tree needs the number that was
  // actually written in order to group consecutive lists together. The number
  // is recovered from the source line and carried to the tree as `data-index`.
  md.core.ruler.push('bettermarkdownmap_list_index', (state) => {
    const lines = state.src.split('\n');
    const orderedStack: boolean[] = [];
    state.tokens.forEach((token) => {
      if (token.type === 'bullet_list_open') {
        orderedStack.push(false);
      } else if (token.type === 'ordered_list_open') {
        orderedStack.push(true);
      } else if (
        token.type === 'bullet_list_close' ||
        token.type === 'ordered_list_close'
      ) {
        orderedStack.pop();
      } else if (
        token.type === 'list_item_open' &&
        orderedStack[orderedStack.length - 1] &&
        token.map
      ) {
        const match = SELECTOR_ORDERED_ITEM.exec(lines[token.map[0]] || '');
        if (match) token.attrSet('data-index', match[1]);
      }
    });
  });
  return md;
}
