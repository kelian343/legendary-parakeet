import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { undo, redo } from 'prosemirror-history';
import localforage from 'localforage';
import schema from '../../prosemirror/schema';
import { createPluginsList } from '../../prosemirror/plugins';
import 'prosemirror-view/style/prosemirror.css';
import './Editor.module.css';
import '../../prosemirror/bidirectionalLink.css';
import { debounce } from 'lodash';

// 配置 localforage
localforage.config({
  name: 'editor-storage',
  storeName: 'editor_contents'
});

// 在组件顶部创建防抖的存储函数
const debouncedSave = debounce(async (contentToStore, editorId, onUpdate) => {
  try {
    await localforage.setItem(`editor-content-${editorId}`, contentToStore);
    onUpdate?.(contentToStore.content);
  } catch (error) {
    console.error('Error saving content:', error);
  }
}, 1000);  // 1秒的延迟

const Editor = forwardRef(({ editorId, initialDoc, onUpdate }, ref) => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  // 处理编辑器内容变化
  const handleContentChange = useCallback((tr) => {
    if (!viewRef.current) return;

    try {
      // 获取当前视图的状态
      const currentState = viewRef.current.state;
      
      // 创建新的事务
      let newTr = currentState.tr;
      
      // 如果是文档改变，复制改变到新事务
      if (tr.docChanged) {
        // 获取所有步骤并应用
        tr.steps.forEach((step, i) => {
          try {
            newTr = newTr.step(step);
          } catch (e) {
            console.warn('Step application failed:', e);
          }
        });
      }

      // 复制选择
      if (tr.selectionSet) {
        newTr.setSelection(tr.selection);
      }

      // 复制存储标记
      if (tr.storedMarksSet) {
        newTr.setStoredMarks(tr.storedMarks);
      }

      // 应用新的状态
      const newState = currentState.apply(newTr);
      viewRef.current.updateState(newState);

      // 更新编辑器容器的滚动状态
      if (editorRef.current) {
        const editorHeight = editorRef.current.offsetHeight;
        const contentHeight = viewRef.current.dom.offsetHeight;
        editorRef.current.style.overflowY = contentHeight > editorHeight ? 'auto' : 'hidden';
      }

      // 只在内容真正发生变化时才保存
      if (newTr.docChanged) {
        const contentToStore = {
          timestamp: Date.now(),
          content: newState.doc.toJSON()
        };
        debouncedSave(contentToStore, editorId, onUpdate);
      }
    } catch (error) {
      console.error('Error in handleContentChange:', error);
      
      // 如果出现错误，尝试恢复到最后的有效状态
      if (viewRef.current) {
        try {
          const recoveryState = EditorState.create({
            schema: viewRef.current.state.schema,
            doc: viewRef.current.state.doc,
            plugins: viewRef.current.state.plugins
          });
          viewRef.current.updateState(recoveryState);
        } catch (recoveryError) {
          console.error('Recovery failed:', recoveryError);
        }
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
        console.log('Initializing editor...');
        setIsLoading(true);
        let initialDocument = null;

        try {
          // 创建一个基础文档结构
          const createEmptyDoc = () => {
            return schema.node("doc", null, [
              schema.node("paragraph", null, [])
            ]);
          };

          if (initialDoc) {
            try {
              initialDocument = schema.nodeFromJSON(initialDoc);
            } catch (e) {
              console.warn('Invalid initial doc, creating empty doc:', e);
              initialDocument = createEmptyDoc();
            }
          } else {
            try {
              const savedItem = await localforage.getItem(`editor-content-${editorId}`);
              const savedContent = savedItem?.content;
              if (savedContent) {
                try {
                  initialDocument = schema.nodeFromJSON(savedContent);
                } catch (e) {
                  console.warn('Invalid saved content, creating empty doc:', e);
                  initialDocument = createEmptyDoc();
                }
              } else {
                initialDocument = createEmptyDoc();
              }
            } catch (error) {
              console.warn('Error loading saved content:', error);
              initialDocument = createEmptyDoc();
            }
          }

          // 创建编辑器状态
          const state = EditorState.create({
            schema,
            doc: initialDocument,
            plugins: createPluginsList(editorId),
          });

          // 创建编辑器视图
          if (!viewRef.current) {
            const view = new EditorView(editorRef.current, {
              state,
              dispatchTransaction: (transaction) => {
                try {
                  // 直接应用事务，简化处理逻辑
                  const newState = view.state.apply(transaction);
                  view.updateState(newState);

                  // 如果文档发生改变，保存内容
                  if (transaction.docChanged) {
                    const contentToStore = {
                      timestamp: Date.now(),
                      content: newState.doc.toJSON()
                    };
                    debouncedSave(contentToStore, editorId, onUpdate);
                  }

                  // 更新滚动状态
                  if (editorRef.current) {
                    const editorHeight = editorRef.current.offsetHeight;
                    const contentHeight = view.dom.offsetHeight;
                    editorRef.current.style.overflowY = contentHeight > editorHeight ? 'auto' : 'hidden';
                  }
                } catch (error) {
                  console.error('Transaction error:', error);
                  // 发生错误时，尝试恢复到最后的有效状态
                  try {
                    const recoveryState = EditorState.create({
                      schema: view.state.schema,
                      doc: view.state.doc,
                      plugins: view.state.plugins
                    });
                    view.updateState(recoveryState);
                  } catch (recoveryError) {
                    console.error('Recovery failed:', recoveryError);
                  }
                }
              },
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
                },
                beforeinput: (view, event) => {
                  // 防止某些浏览器的自动修正行为
                  if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
                    event.preventDefault();
                    return true;
                  }
                  return false;
                }
              }
            });

            viewRef.current = view;
            console.log('Editor initialized successfully');
          }

        } catch (error) {
          console.error('Editor initialization failed:', error);
          initialDocument = schema.node("doc", null, [
            schema.node("paragraph", null, [])
          ]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeEditor();

    return () => {
      if (viewRef.current) {
        console.log('Destroying editor...');
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [editorId, initialDoc, onUpdate]);

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