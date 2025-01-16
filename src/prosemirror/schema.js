// src/prosemirror/schema.js
import { Schema } from 'prosemirror-model';
import { addListNodes } from 'prosemirror-schema-list';
import { schema as basicSchema } from 'prosemirror-schema-basic';

// Add custom paragraph node and list nodes to the basic schema
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
    // Reduced spacing values
    style: "margin-bottom: 1em; margin-top: 0; line-height: 1.7;" 
  }, 0]
}), "paragraph block*", "block");

// Add horizontal rule node
const nodesWithHR = nodes.addToEnd("horizontal_rule", {
  group: "block",
  parseDOM: [{tag: "hr"}],
  toDOM() { return ["hr"] }
});

// Define marks
const marks = {
  // Include basic schema marks
  ...basicSchema.spec.marks,

  // Bold mark
  strong: {
    parseDOM: [
      { tag: "strong" },
      { tag: "b" },
      { style: "font-weight=700" },
      { style: "font-weight=bold" }
    ],
    toDOM() { return ["strong"] }
  },

  // Italic mark
  em: {
    parseDOM: [
      { tag: "i" },
      { tag: "em" },
      { style: "font-style=italic" }
    ],
    toDOM() { return ["em"] }
  },

  // Bidirectional link mark
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

  // In schema.js, add to the marks object:
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

// Create and export schema with HR support
const schema = new Schema({
  nodes: nodesWithHR,
  marks
});

export default schema;