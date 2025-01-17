// src/prosemirror/plugins.js
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { inputRules } from 'prosemirror-inputrules';
import { toggleMark } from 'prosemirror-commands';
import { createMarkdownInputRules } from './markdownInputRules';
import { bidirectionalLinkPlugin, createBidirectionalLink } from './bidirectionalLinkPlugin';
import { autoHighlightPlugin } from './autoHighlightPlugin';
import schema from './schema';

// Create a function to generate plugin list, accepting editorId parameter
export const createPluginsList = (editorId) => {
  // History keymap configuration
  const historyKeymap = {
    'Mod-z': undo,
    'Mod-y': redo,
    'Mod-Shift-z': redo,
  };

  // Bidirectional link keymap
  const bidirectionalLinkKeymap = {
    'Ctrl-q': createBidirectionalLink(editorId)
  };

  // Markdown keyboard shortcuts
  const markdownKeymap = {
    'Mod-b': toggleMark(schema.marks.strong),
    'Mod-i': toggleMark(schema.marks.em),
    'Mod-`': toggleMark(schema.marks.code),
    // Can add more markdown shortcuts here
  };

  // Return array of plugins in specific order
  return [
    history(),
    bidirectionalLinkPlugin(editorId),
    autoHighlightPlugin(editorId),  // Add this line
    inputRules({ rules: createMarkdownInputRules(schema) }),
    keymap(bidirectionalLinkKeymap),
    keymap(markdownKeymap),
    keymap(historyKeymap),
    keymap(baseKeymap),
  ];
};