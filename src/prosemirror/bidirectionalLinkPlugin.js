import { Plugin, PluginKey } from 'prosemirror-state';
import { v4 as uuidv4 } from 'uuid';

export const bidirectionalLinkKey = new PluginKey('bidirectional-link');

// 存储全局链接状态
export let globalLinkState = {
  waitingForPartner: null,
  waitingEditorId: null
};

export const bidirectionalLinkPlugin = (editorId) => {
  return new Plugin({
    key: bidirectionalLinkKey,

    props: {
      handleClick(view, pos, event) {
        const { state } = view;
        const { doc, schema } = state;
        const linkMark = schema.marks.bidirectional_link;

        // 获取点击位置的节点和位置信息
        const $pos = state.doc.resolve(pos);
        const node = $pos.parent.maybeChild($pos.index());
        
        if (!node) return false;
        
        const mark = node.marks.find(m => m.type === linkMark);
        
        if (mark) {
          console.log("找到链接标记:", mark.attrs);
          const { id, partnerId, targetEditorId } = mark.attrs;

          if (targetEditorId && targetEditorId !== editorId) {
            // 跨编辑器导航
            console.log("触发跨编辑器导航");
            document.dispatchEvent(new CustomEvent('navigateToLink', {
              detail: {
                fromEditorId: editorId,
                toEditorId: targetEditorId,
                partnerId: partnerId,
                sourceId: id
              }
            }));
          } else {
            // 同一编辑器内导航
            console.log("触发同编辑器导航");
            let partnerPos = null;
            let found = false;

            // 改进的伙伴链接查找逻辑
            doc.nodesBetween(0, doc.content.size, (node, nodePos) => {
              if (found) return false; // 如果已找到就停止遍历
              
              if (node.marks && node.marks.length) {
                const partnerMark = node.marks.find(m => {
                  if (m.type !== linkMark) return false;
                  
                  // 检查双向关系
                  const isPartner = (m.attrs.id === partnerId && m.attrs.partnerId === id) ||
                                  (m.attrs.partnerId === id && m.attrs.id === partnerId);
                  
                  // 确保不是同一个位置的标记
                  return isPartner && nodePos !== pos;
                });

                if (partnerMark) {
                  partnerPos = nodePos;
                  found = true;
                  return false; // 停止遍历
                }
              }
            });

            if (partnerPos !== null) {
              // 滚动到伙伴链接位置
              const editorContainer = view.dom.closest('.editor-container');
              if (editorContainer) {
                // 获取确切的坐标
                const coords = view.coordsAtPos(partnerPos);
                const containerRect = editorContainer.getBoundingClientRect();
                
                // 计算精确的滚动位置
                const scrollTop = coords.top - containerRect.top + editorContainer.scrollTop - (editorContainer.offsetHeight / 2);
                
                // 使用平滑滚动
                editorContainer.scrollTo({
                  top: scrollTop,
                  behavior: 'smooth'
                });

                // 添加视觉反馈
                try {
                  const domInfo = view.domAtPos(partnerPos);
                  const linkElement = domInfo.node.querySelector('.bidirectional-link') || domInfo.node;
                  
                  if (linkElement) {
                    // 高亮伙伴链接
                    const highlight = document.createElement('span');
                    highlight.style.position = 'absolute';
                    highlight.style.backgroundColor = 'rgba(66, 153, 225, 0.2)';
                    highlight.style.borderRadius = '4px';
                    highlight.style.transition = 'opacity 0.3s ease';
                    
                    const rect = linkElement.getBoundingClientRect();
                    highlight.style.left = `${rect.left}px`;
                    highlight.style.top = `${rect.top}px`;
                    highlight.style.width = `${rect.width}px`;
                    highlight.style.height = `${rect.height}px`;
                    highlight.style.pointerEvents = 'none';
                    
                    document.body.appendChild(highlight);
                    
                    // 淡出效果
                    requestAnimationFrame(() => {
                      highlight.style.opacity = '1';
                      setTimeout(() => {
                        highlight.style.opacity = '0';
                        setTimeout(() => {
                          document.body.removeChild(highlight);
                        }, 300);
                      }, 1000);
                    });
                  }
                } catch (e) {
                  console.warn('Failed to add visual feedback:', e);
                }
              }
            }
          }
          return true;
        }
        return false;
      }
    }
  });
};

export const createBidirectionalLink = (editorId) => (state, dispatch) => {
  const schema = state.schema;
  const linkMark = schema.marks.bidirectional_link;
  
  if (!linkMark) {
    console.error('bidirectional_link mark is not defined in the schema');
    return false;
  }

  const { selection, tr } = state;
  const { from, to } = selection;
  const id = uuidv4();
  
  if (!globalLinkState.waitingForPartner) {
    // 第一个链接
    globalLinkState = {
      waitingForPartner: id,
      waitingEditorId: editorId
    };
    
    if (dispatch) {
      console.log("创建第一个链接:", {id, editorId});
      dispatch(tr.insertText('🔗', from, to)
        .addMark(from, from + 2,
          linkMark.create({ 
            id, 
            partnerId: null,
            targetEditorId: null 
          })));
    }
  } else {
    // 第二个链接，建立配对
    const partnerId = globalLinkState.waitingForPartner;
    const sourceEditorId = globalLinkState.waitingEditorId;
    
    // 重置全局状态
    globalLinkState = {
      waitingForPartner: null,
      waitingEditorId: null
    };
    
    if (dispatch) {
      // 插入第二个链接
      const insertTr = tr.insertText('🔗', from, to)
        .addMark(from, from + 2,
          linkMark.create({ 
            id,
            partnerId,
            targetEditorId: sourceEditorId
          }));
      
      dispatch(insertTr);

      // 延迟一帧后更新第一个链接
      requestAnimationFrame(() => {
        // 更新第一个链接
        document.dispatchEvent(new CustomEvent('updateFirstLink', {
          bubbles: true,
          detail: {
            editorId: sourceEditorId,
            linkId: partnerId,
            partnerId: id,
            targetEditorId: editorId
          }
        }));
      });
    }
  }
  return true;
};