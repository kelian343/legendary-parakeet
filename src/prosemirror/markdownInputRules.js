// src/prosemirror/markdownInputRules.js
import { InputRule } from 'prosemirror-inputrules';
import { generateColorFromText } from '../utils/colorUtils';

// First, let's create a specialized version of markInputRule for highlighting
function highlightMarkRule(regexp, markType) {
  return new InputRule(regexp, (state, match, start, end) => {
    const textStart = start + match[0].indexOf(match[2]);
    const textEnd = textStart + match[2].length;
    
    const docSize = state.doc.content.size;
    if (start < 0 || end > docSize || textStart < 0 || textEnd > docSize) {
      return null;
    }

    try {
      const content = match[2];
      const isDarkMode = document.body.classList.contains('dark');
      const highlightColor = generateColorFromText(content, isDarkMode);

      const tr = state.tr;
      
      // First add mark
      tr.addMark(textStart, textEnd, markType.create({
        content,
        color: highlightColor
      }));
      
      // Then delete the markers in reverse order
      tr.delete(textEnd, end)            // Delete closing =
        .delete(start, textStart);       // Delete opening =

      // Maintain cursor position
      const finalCursorPos = textStart + content.length;
      tr.setSelection(state.selection.constructor.near(tr.doc.resolve(finalCursorPos)));

      // After we've handled the local editor's changes, broadcast to others
      requestAnimationFrame(() => {
        document.dispatchEvent(new CustomEvent('syncHighlight', {
          detail: {
            content,
            color: highlightColor,
            searchAllEditors: true
          }
        }));
      });

      return tr;
    } catch (e) {
      console.error('Error in highlightMarkRule:', e);
      return null;
    }
  });
}


// Helper for text marks (bold and italic)
function markInputRule(regexp, markType) {
  return new InputRule(regexp, (state, match, start, end) => {
    const textStart = start + match[0].indexOf(match[2]);
    const textEnd = textStart + match[2].length;
    
    const docSize = state.doc.content.size;
    if (start < 0 || end > docSize || textStart < 0 || textEnd > docSize) {
      return null;
    }

    try {
      const tr = state.tr;
      tr.addMark(textStart, textEnd, markType.create());
      tr.delete(textEnd, end);
      tr.delete(start, textStart);
      return tr;
    } catch (e) {
      console.error('Error in markInputRule:', e);
      return null;
    }
  });
}

// Helper for indentation
function indentRule(regexp, spaces) {
  return new InputRule(regexp, (state, match, start, end) => {
    try {
      const tr = state.tr;
      tr.delete(start, end);
      tr.insertText(' '.repeat(spaces), start);
      return tr;
    } catch (e) {
      console.error('Error in indentRule:', e);
      return null;
    }
  });
}

// Helper for horizontal rule
function horizontalRuleRule(regexp, nodeType) {
  return new InputRule(regexp, (state, match, start, end) => {
    try {
      const tr = state.tr.replaceRangeWith(start, end, nodeType.create());
      return tr;
    } catch (e) {
      console.error('Error in horizontalRuleRule:', e);
      return null;
    }
  });
}

export function createMarkdownInputRules(schema) {
  const rules = [];

  // Bold: +text+
  if (schema.marks.strong) {
    rules.push(
      markInputRule(/(\+)(\s*[^+]+?\s*)(\+)$/, schema.marks.strong)
    );
  }

  // Italic: -text-
  if (schema.marks.em) {
    rules.push(
      markInputRule(/(-)(\s*[^-]+?)(-)$/, schema.marks.em)
    );
  }

  // Headings: # to ######
  if (schema.nodes.heading) {
    rules.push(
      new InputRule(/^(#{1,6})\s$/, (state, match, start, end) => {
        const level = match[1].length;
        return state.tr
          .delete(start, end)
          .setBlockType(start, start, schema.nodes.heading, { level });
      })
    );
  }

  // Single indentation rule: * and space for 8 spaces
  rules.push(indentRule(/^\*\s$/, 8));

  // Horizontal rule: ---, ***, ___
  if (schema.nodes.horizontal_rule) {
    rules.push(
      horizontalRuleRule(/^(?:---|\*\*\*|___)\s$/, schema.nodes.horizontal_rule)
    );
  }

  // Synchronized highlighting: =text=
  if (schema.marks.highlight_sync) {
    rules.push(
      highlightMarkRule(/(\=)([^=]+?)(\=)$/, schema.marks.highlight_sync)
    );
  }

  return rules;
}