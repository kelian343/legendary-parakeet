// src/prosemirror/autoHighlightPlugin.js
import { Plugin, PluginKey } from 'prosemirror-state';

export const autoHighlightKey = new PluginKey('auto-highlight');

export function autoHighlightPlugin(editorId) {
  let typingTimer = null;

  return new Plugin({
    key: autoHighlightKey,
    state: {
      init() {
        return null;
      },
      apply(tr, value, oldState, newState) {
        return value;
      }
    },
    view(editorView) {
      return {
        update: (view, prevState) => {
          // Clear existing timer
          if (typingTimer) {
            clearTimeout(typingTimer);
          }

          // Only proceed if there are document changes
          if (view.state.doc === prevState.doc) return;

          // Set new timer to process after typing pause
          typingTimer = setTimeout(() => {
            const highlightMark = view.state.schema.marks.highlight_sync;
            if (!highlightMark) return;

            // Find all highlighted texts in the document
            const highlightedTexts = new Map();
            view.state.doc.descendants((node, pos) => {
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

            let tr = view.state.tr;
            let changed = false;

            // Check entire document for matches
            view.state.doc.descendants((node, pos) => {
              if (node.isText) {
                for (const [text, highlight] of highlightedTexts) {
                  let index = node.text.indexOf(text);
                  while (index !== -1) {
                    const from = pos + index;
                    const to = from + text.length;

                    // Check if this range already has a highlight mark
                    const hasHighlight = view.state.doc.rangeHasMark(from, to, highlightMark);

                    // If not highlighted, add the mark
                    if (!hasHighlight) {
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

            // Apply changes if any were made
            if (changed) {
              view.dispatch(tr);
            }
          }, 1500); // Wait 500ms after typing stops
        },
        destroy() {
          if (typingTimer) {
            clearTimeout(typingTimer);
          }
        }
      };
    }
  });
}