import { Schema } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';

// 扩展基本节点以包含列表
const nodes = addListNodes(basicSchema.spec.nodes, "paragraph block*", "block");

// 定义所有 marks
const marks = {
  // 包含基本 schema 中的所有 marks
  ...basicSchema.spec.marks,

  // 添加 font mark
  font: {
    attrs: {
      font: { default: 'Arial' }
    },
    inclusive: false,
    parseDOM: [{
      style: 'font-family',
      getAttrs: value => ({ font: value })
    }],
    toDOM: mark => ['span', {
      style: `font-family: ${mark.attrs.font}`
    }, 0]
  },

  // 添加双向链接 mark
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

// 创建最终的 schema
const schema = new Schema({
  nodes,
  marks
});

export default schema;