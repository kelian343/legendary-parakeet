import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { undo, redo } from 'prosemirror-history';
import schema from '../../prosemirror/schema';
import { createPluginsList } from '../../prosemirror/plugins';
import 'prosemirror-view/style/prosemirror.css';
import './Editor.module.css';
import '../../prosemirror/bidirectionalLink.css';

const Editor = forwardRef(({ editorId, initialDoc, onUpdate }, ref) => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  // 处理编辑器内容变化
  const handleContentChange = useCallback((transaction) => {
    if (viewRef.current) {
      const newState = viewRef.current.state.apply(transaction);
      viewRef.current.updateState(newState);

      // 更新编辑器容器的滚动状态
      const editorHeight = editorRef.current.offsetHeight;
      const contentHeight = viewRef.current.dom.offsetHeight;
      editorRef.current.style.overflowY = contentHeight > editorHeight ? 'auto' : 'hidden';

      // 尝试保存到 localStorage，添加错误处理和存储优化
      try {
        const json = newState.doc.toJSON();
        
        // 如果内容太大，只存储部分内容或关键信息
        const contentToStore = {
          timestamp: Date.now(),
          content: json,
          // 可以添加其他必要的元数据
        };

        // 尝试存储
        try {
          localStorage.setItem(`editor-content-${editorId}`, JSON.stringify(contentToStore));
        } catch (storageError) {
          console.warn('Storage quota exceeded, clearing old data...');
          
          // 清理策略：删除旧的编辑器内容
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('editor-content-')) {
              try {
                const storedData = JSON.parse(localStorage.getItem(key));
                keysToRemove.push({
                  key,
                  timestamp: storedData.timestamp || 0
                });
              } catch (e) {
                keysToRemove.push({ key, timestamp: 0 });
              }
            }
          }

          // 按时间戳排序并删除最旧的项目，直到有足够空间
          keysToRemove
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(0, Math.ceil(keysToRemove.length / 2))
            .forEach(item => {
              localStorage.removeItem(item.key);
            });

          // 再次尝试存储
          try {
            localStorage.setItem(`editor-content-${editorId}`, JSON.stringify(contentToStore));
          } catch (finalError) {
            console.error('Unable to store editor content after cleanup');
          }
        }

        // 调用父组件的更新回调
        onUpdate?.(json);
      } catch (error) {
        console.error('Error saving editor content:', error);
      }
    }
  }, [editorId, onUpdate]);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getContent: () => {
      if (viewRef.current) {
        return {
          doc: viewRef.current.state.doc.toJSON(),
          position: viewRef.current.dom.parentElement ? {
            x: viewRef.current.dom.parentElement.style.left,
            y: viewRef.current.dom.parentElement.style.top,
          } : null,
          size: viewRef.current.dom.parentElement ? {
            width: viewRef.current.dom.parentElement.style.width,
            height: viewRef.current.dom.parentElement.style.height,
          } : null,
          isVisible: viewRef.current.dom.parentElement ? 
            !viewRef.current.dom.parentElement.classList.contains('hidden') : true,
        };
      }
      return null;
    },
    focus: () => {
      viewRef.current?.focus();
    },
    undo: () => {
      undo(viewRef.current?.state, viewRef.current?.dispatch);
    },
    redo: () => {
      redo(viewRef.current?.state, viewRef.current?.dispatch);
    },
    
    scrollToLink: (linkId) => {
      if (!viewRef.current) return;
      console.log("尝试滚动到链接:", linkId);
      
      const { state } = viewRef.current;
      const { doc } = state;
      let targetPos = null;

      // 查找链接位置
      doc.descendants((node, pos) => {
        if (node.marks) {
          const mark = node.marks.find(m => 
            m.type.name === 'bidirectional_link' && 
            (m.attrs.id === linkId || m.attrs.partnerId === linkId));
          if (mark) {
            targetPos = pos;
            return false;
          }
        }
      });

      if (targetPos !== null) {
        console.log("找到链接位置:", targetPos);
        const editorContainer = viewRef.current.dom.closest('.editor-container');
        if (editorContainer) {
          // 等待一帧以确保 DOM 已更新
          requestAnimationFrame(() => {
            const coords = viewRef.current.coordsAtPos(targetPos);
            const containerRect = editorContainer.getBoundingClientRect();
            
            // 计算精确的滚动位置
            const scrollTop = coords.top - containerRect.top + editorContainer.scrollTop - (editorContainer.offsetHeight / 2);
            
            // 使用平滑滚动
            editorContainer.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });

            // 添加视觉反馈
            const domInfo = viewRef.current.domAtPos(targetPos);
            const linkElement = domInfo.node.querySelector('.bidirectional-link') || domInfo.node;
            
            if (linkElement) {
              // 先闪烁链接
              const originalTransition = linkElement.style.transition;
              const originalTransform = linkElement.style.transform;
              linkElement.style.transition = 'transform 0.3s ease';
              linkElement.style.transform = 'scale(1.5)';
              
              setTimeout(() => {
                linkElement.style.transform = originalTransform;
                setTimeout(() => {
                  linkElement.style.transition = originalTransition;
                }, 300);
              }, 500);
            }
          });
        }
      }
    },

    updateLinkPartner: (linkId, partnerId, targetEditorId) => {
      if (!viewRef.current) return;
      console.log("更新链接伙伴:", {linkId, partnerId, targetEditorId});
      
      const { state } = viewRef.current;
      const { doc, schema } = state;
      const linkMark = schema.marks.bidirectional_link;

      if (!linkMark) return;

      // 创建新的事务
      let tr = state.tr;
      let found = false;

      // 查找并更新链接
      doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (!found && node.marks) {
          const mark = node.marks.find(m => 
            m.type.name === 'bidirectional_link' && m.attrs.id === linkId);
          if (mark) {
            const newMark = linkMark.create({ 
              id: linkId,
              partnerId,
              targetEditorId
            });
            tr = tr.removeMark(pos, pos + 2, linkMark)
                  .addMark(pos, pos + 2, newMark);
            found = true;
            return false;
          }
        }
      });

      if (found) {
        viewRef.current.dispatch(tr);
      }
    }
  }));

  // 初始化编辑器
  useEffect(() => {
    const initializeEditor = async () => {
      if (editorRef.current && !viewRef.current) {
        setIsLoading(true);
        let initialDocument = null;

        try {
          // 尝试加载初始文档
          if (initialDoc) {
            initialDocument = schema.nodeFromJSON(initialDoc);
          } else {
            let savedContent = null;
            try {
              const savedItem = localStorage.getItem(`editor-content-${editorId}`);
              if (savedItem) {
                const parsed = JSON.parse(savedItem);
                savedContent = parsed.content; // 获取实际内容
              }
            } catch (error) {
              console.warn('Error loading saved content:', error);
            }

            initialDocument = savedContent ? 
              schema.nodeFromJSON(savedContent) : 
              schema.topNodeType.createAndFill();
          }

          // 创建编辑器状态
          const state = EditorState.create({
            schema,
            doc: initialDocument,
            plugins: createPluginsList(editorId),
          });

          // 创建编辑器视图
          viewRef.current = new EditorView(editorRef.current, {
            state,
            dispatchTransaction: handleContentChange,
            attributes: {
              class: 'prosemirror-editor',
              role: 'textbox',
              'aria-multiline': 'true',
              'aria-label': '富文本编辑器',
              'data-editor-id': editorId
            },
            handleDOMEvents: {
              focus: (view, event) => {
                editorRef.current.classList.add('focused');
              },
              blur: (view, event) => {
                editorRef.current.classList.remove('focused');
              }
            }
          });

        } catch (error) {
          console.error('Editor initialization failed:', error);
          initialDocument = schema.topNodeType.createAndFill();
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeEditor();

    // 清理函数
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [editorId, initialDoc, handleContentChange]);

  // 渲染编辑器
  return (
    <div 
      className={`editor ${isLoading ? 'loading' : ''}`} 
      ref={editorRef}
      data-editor-id={editorId}
    >
      {isLoading && (
        <div className="editor-loading">
          <span>加载中...</span>
        </div>
      )}
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;