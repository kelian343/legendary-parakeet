// src/prosemirror/markdownInputRules.js
import { InputRule } from 'prosemirror-inputrules';

// Helper for text marks (bold, code)
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

// Helper for links
function linkRule(regexp, markType) {
  return new InputRule(regexp, (state, match, start, end) => {
    const [full, text, href, title] = match;
    const docSize = state.doc.content.size;
    if (start < 0 || end > docSize) return null;

    try {
      return state.tr
        .delete(start, end)
        .addMark(
          start,
          start + text.length,
          markType.create({ href, title: title || null })
        )
        .insertText(text, start);
    } catch (e) {
      console.error('Error in linkRule:', e);
      return null;
    }
  });
}

// Helper for indentation
function indentRule(regexp, spaces) {
  return new InputRule(regexp, (state, match, start, end) => {
    try {
      const tr = state.tr;
      // Delete the marker character and space
      tr.delete(start, end);
      // Insert the specified number of spaces
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

  // Bold only - using **text** syntax
  if (schema.marks.strong) {
    rules.push(
      markInputRule(/(\*\*)(\s*[^*]+?\s*)(\*\*)$/, schema.marks.strong)
    );
  }

  // Code
  if (schema.marks.code) {
    rules.push(
      markInputRule(/(`)(\s*[^`]+?\s*)(`)$/, schema.marks.code)
    );
  }

  // Heading rules
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

  // Horizontal rule
  if (schema.nodes.horizontal_rule) {
    rules.push(
      horizontalRuleRule(/^(?:---|\*\*\*|___)\s$/, schema.nodes.horizontal_rule)
    );
  }

  // Link rules
  if (schema.marks.link) {
    rules.push(
      linkRule(
        /\[([^\]]+)\]\(([^)"]+)(?:\s+"([^"]+)")?\)\s$/,
        schema.marks.link
      ),
      linkRule(
        /\[([^\]]+)\]\[([^\]]*)\]\s$/,
        schema.marks.link
      )
    );
  }

  return rules;
}