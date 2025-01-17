// src/prosemirror/autoHighlightPlugin.js
import { Plugin, PluginKey } from 'prosemirror-state';

export const autoHighlightKey = new PluginKey('auto-highlight');

export function autoHighlightPlugin(editorId) {
  return new Plugin({
    key: autoHighlightKey,
    appendTransaction: (transactions, oldState, newState) => {
      // Only proceed if there are document changes
      if (!transactions.some(tr => tr.docChanged)) return null;
      
      // Get highlight mark type
      const highlightMark = newState.schema.marks.highlight_sync;
      if (!highlightMark) return null;

      let tr = newState.tr;
      let changed = false;

      // Find all highlighted texts
      const highlightedTexts = new Map(); // text -> {color, content}
      newState.doc.descendants((node, pos) => {
        if (node.marks) {
          node.marks.forEach(mark => {
            if (mark.type === highlightMark) {
              highlightedTexts.set(mark.attrs.content, {
                color: mark.attrs.color,
                content: mark.attrs.content
              });
            }
          });
        }
      });

      // Look for matching text that isn't highlighted
      newState.doc.descendants((node, pos) => {
        if (node.isText) {
          for (const [text, highlight] of highlightedTexts) {
            let index = node.text.indexOf(text);
            while (index !== -1) {
              const from = pos + index;
              const to = from + text.length;
              
              // Check if this range already has a highlight mark
              const marks = newState.doc.rangeHasMark(from, to, highlightMark);
              
              // If not highlighted, add the mark
              if (!marks) {
                tr = tr.addMark(
                  from,
                  to,
                  highlightMark.create({
                    content: highlight.content,
                    color: highlight.color
                  })
                );
                changed = true;
              }
              
              index = node.text.indexOf(text, index + 1);
            }
          }
        }
      });

      return changed ? tr : null;
    }
  });
}