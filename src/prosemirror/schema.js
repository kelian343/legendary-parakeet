import { Schema } from 'prosemirror-model';
import { addListNodes } from 'prosemirror-schema-list';
import { schema as basicSchema } from 'prosemirror-schema-basic';

const nodes = addListNodes(basicSchema.spec.nodes.update("paragraph", {
 content: "inline*",
 group: "block",
 parseDOM: [{
   tag: "p",
   getAttrs: dom => ({
     style: dom.getAttribute('style')
   })
 }],
 toDOM: () => ["p", { 
   style: "margin-bottom: 1em; margin-top: 0; line-height: 1.7;" 
 }, 0]
}), "paragraph block*", "block");

const nodesWithHR = nodes.addToEnd("horizontal_rule", {
 group: "block",
 parseDOM: [{tag: "hr"}],
 toDOM() { return ["hr"] }
});

const marks = {
 ...basicSchema.spec.marks,

 strong: {
   parseDOM: [
     { tag: "strong" },
     { tag: "b" },
     { style: "font-weight=700" },
     { style: "font-weight=bold" }
   ],
   toDOM() { return ["strong"] }
 },

 em: {
   parseDOM: [
     { tag: "i" },
     { tag: "em" },
     { style: "font-style=italic" }
   ],
   toDOM() { return ["em"] }
 },

 strikethrough: {
   parseDOM: [
     { tag: "strike" },
     { tag: "s" },
     { style: "text-decoration=line-through" }
   ],
   toDOM() { return ["s"] }
 },

 custom_font: {
  attrs: {
    fontFamily: { default: 'PingFangSC-Ultralight' }
  },
  parseDOM: [{
    tag: 'span[data-custom-font]',
    getAttrs: dom => ({
      fontFamily: dom.getAttribute('data-font-family')
    })
  }],
  toDOM: mark => ['span', {
    'data-custom-font': '',
    'data-font-family': mark.attrs.fontFamily,
    style: `
      font-family: PingFangSC-Ultralight;
      display: block;
      background: var(--bg-color);
      border-radius: 6px;
      padding: 1em;
      margin: 0.5em 0;
      border: 1px solid var(--border-color);
      font-size: 0.95em;
      line-height: 1.6;
      color: var(--text-color);
      box-shadow: 0 2px 4px var(--shadow-color);
    `,
    className: 'custom-font-block'
  }, 0]
 },

 bidirectional_link: {
   attrs: {
     id: { default: null },
     partnerId: { default: null },
     targetEditorId: { default: null }
   },
   inclusive: true,
   parseDOM: [{
     tag: 'span[data-bidirectional-link]',
     getAttrs: dom => ({
       id: dom.getAttribute('data-link-id'),
       partnerId: dom.getAttribute('data-partner-id'),
       targetEditorId: dom.getAttribute('data-target-editor-id')
     })
   }],
   toDOM: mark => ['span', {
     'data-bidirectional-link': '',
     'data-link-id': mark.attrs.id,
     'data-partner-id': mark.attrs.partnerId,
     'data-target-editor-id': mark.attrs.targetEditorId,
     class: 'bidirectional-link'
   }, 0]
 },

 highlight_sync: {
   attrs: {
     content: { default: '' },
     color: { default: '' }
   },
   inclusive: true,
   parseDOM: [{
     tag: 'span[data-highlight-sync]',
     getAttrs: dom => ({
       content: dom.getAttribute('data-content'),
       color: dom.getAttribute('data-color')
     })
   }],
   toDOM: mark => ['span', {
     'data-highlight-sync': '',
     'data-content': mark.attrs.content,
     'data-color': mark.attrs.color,
     class: 'highlight-sync',
     style: `background-color: ${mark.attrs.color}`
   }, 0]
 }
};

const schema = new Schema({
 nodes: nodesWithHR,
 marks
});

export default schema;