// src/prosemirror/schema.js
import { Schema } from 'prosemirror-model';
import { addListNodes } from 'prosemirror-schema-list';
import { schema as basicSchema } from 'prosemirror-schema-basic';

// Add list nodes to the basic schema
const nodes = addListNodes(basicSchema.spec.nodes, "paragraph block*", "block");

// Add horizontal rule node
const nodesWithHR = nodes.addToEnd("horizontal_rule", {
  group: "block",
  parseDOM: [{tag: "hr"}],
  toDOM() { return ["hr"] }
});

// Define marks
const marks = {
  ...basicSchema.spec.marks,

  // Existing marks
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

  code: {
    parseDOM: [{ tag: "code" }],
    toDOM() { return ["code"] }
  },

  // Link mark with support for titles
  link: {
    attrs: {
      href: { default: '' },
      title: { default: null }
    },
    inclusive: false,
    parseDOM: [{
      tag: 'a[href]',
      getAttrs(dom) {
        return {
          href: dom.getAttribute('href'),
          title: dom.getAttribute('title')
        }
      }
    }],
    toDOM(mark) {
      const { href, title } = mark.attrs;
      return ['a', {
        href,
        title,
        rel: 'noopener noreferrer',
        target: '_blank'
      }]
    }
  },

  // Existing bidirectional_link mark
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
  }
};

// Create and export schema
const schema = new Schema({
  nodes: nodesWithHR,
  marks
});

export default schema;