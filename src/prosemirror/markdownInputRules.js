// src/prosemirror/markdownInputRules.js
import { InputRule } from 'prosemirror-inputrules';

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

  return rules;
}