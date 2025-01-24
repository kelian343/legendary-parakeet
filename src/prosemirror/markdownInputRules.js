import { InputRule } from 'prosemirror-inputrules';
import { generateColorFromText } from '../utils/colorUtils';

function highlightMarkRule(regexp, markType) {
 return new InputRule(regexp, (state, match, start, end) => {
   const textStart = start + match[0].indexOf(match[2]);
   const textEnd = textStart + match[2].length;
   
   if (start < 0 || end > state.doc.content.size || textStart < 0 || textEnd > state.doc.content.size) {
     return null;
   }

   try {
     const content = match[2];
     const isDarkMode = document.body.classList.contains('dark');
     const highlightColor = generateColorFromText(content, isDarkMode);

     const tr = state.tr;
     tr.addMark(textStart, textEnd, markType.create({
       content,
       color: highlightColor
     }))
     .delete(textEnd, end)
     .delete(start, textStart);

     tr.setSelection(state.selection.constructor.near(tr.doc.resolve(textStart + content.length)));

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

function markInputRule(regexp, markType) {
 return new InputRule(regexp, (state, match, start, end) => {
   const textStart = start + match[0].indexOf(match[2]);
   const textEnd = textStart + match[2].length;
   
   if (start < 0 || end > state.doc.content.size || textStart < 0 || textEnd > state.doc.content.size) {
     return null;
   }

   try {
     return state.tr
       .addMark(textStart, textEnd, markType.create())
       .delete(textEnd, end)
       .delete(start, textStart);
   } catch (e) {
     console.error('Error in markInputRule:', e);
     return null;
   }
 });
}

function indentRule(regexp, spaces) {
 return new InputRule(regexp, (state, match, start, end) => {
   try {
     return state.tr
       .delete(start, end)
       .insertText(' '.repeat(spaces), start);
   } catch (e) {
     console.error('Error in indentRule:', e);
     return null;
   }
 });
}

function horizontalRuleRule(regexp, nodeType) {
 return new InputRule(regexp, (state, match, start, end) => {
   try {
     return state.tr.replaceRangeWith(start, end, nodeType.create());
   } catch (e) {
     console.error('Error in horizontalRuleRule:', e);
     return null;
   }
 });
}

export function createMarkdownInputRules(schema) {
 const rules = [];

 if (schema.marks.custom_font) {
  rules.push(markInputRule(/(\=)(.*?)(\=)$/, schema.marks.custom_font));
}

 if (schema.marks.strong) {
   rules.push(markInputRule(/(\+)(\s*[^+]+?\s*)(\+)$/, schema.marks.strong));
 }

 if (schema.marks.em) {
   rules.push(markInputRule(/(-)(\s*[^-]+?)(-)$/, schema.marks.em));
 }

 if (schema.marks.strikethrough) {
  rules.push(markInputRule(/(\/)(.*?)(\/)\s?$/, schema.marks.strikethrough));
 }

 if (schema.nodes.heading) {
   rules.push(
     new InputRule(/^(#{1,6})\s$/, (state, match, start, end) => {
       return state.tr
         .delete(start, end)
         .setBlockType(start, start, schema.nodes.heading, { level: match[1].length });
     })
   );
 }

 rules.push(indentRule(/^\*\s$/, 8));

 if (schema.nodes.horizontal_rule) {
   rules.push(horizontalRuleRule(/^(?:---|\*\*\*|___)\s$/, schema.nodes.horizontal_rule));
 }

 if (schema.marks.highlight_sync) {
   rules.push(highlightMarkRule(/(\=)([^=]+?)(\=)$/, schema.marks.highlight_sync));
 }

 return rules;
}