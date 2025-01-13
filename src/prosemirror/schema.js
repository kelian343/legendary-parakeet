// src/prosemirror/schema.js
import { Schema } from 'prosemirror-model';
import { addListNodes } from 'prosemirror-schema-list';
import { schema as basicSchema } from 'prosemirror-schema-basic';

// Add list nodes to the basic schema
const nodes = addListNodes(basicSchema.spec.nodes, "paragraph block*", "block");

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
  }
};

// Create and export the final schema
const schema = new Schema({
  nodes,
  marks
});

export default schema;