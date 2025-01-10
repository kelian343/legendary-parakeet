import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { bidirectionalLinkPlugin, createBidirectionalLink } from './bidirectionalLinkPlugin';

// 创建一个函数来生成插件列表，接收 editorId 参数
export const createPluginsList = (editorId) => {
  const historyKeymap = {
    'Mod-z': undo,
    'Mod-y': redo,
    'Mod-Shift-z': redo,
  };

  // 双向链接快捷键
  const bidirectionalLinkKeymap = {
    'Ctrl-q': createBidirectionalLink(editorId)
  };

  return [
    history(),
    bidirectionalLinkPlugin(editorId),
    keymap(bidirectionalLinkKeymap),
    keymap(historyKeymap),
    keymap(baseKeymap),
  ];
};