// src/prosemirror/markdownInputRules.js
import { InputRule } from 'prosemirror-inputrules';

// Helper for text marks (bold)
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

export function createMarkdownInputRules(schema) {
  const rules = [];

  // Bold: **text**
  if (schema.marks.strong) {
    rules.push(
      markInputRule(/(\*\*)(\s*[^*]+?\s*)(\*\*)$/, schema.marks.strong)
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

  // Indentation rules
  rules.push(indentRule(/^\*\s$/, 4));  // * and space for 4 spaces
  rules.push(indentRule(/^\+\s$/, 8));  // + and space for 8 spaces

  return rules;
}