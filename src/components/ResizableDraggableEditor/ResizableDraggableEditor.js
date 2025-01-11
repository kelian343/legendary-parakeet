import React, { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import Editor from '../Editor/Editor';
import './ResizableDraggableEditor.css';

const ResizableDraggableEditor = forwardRef(({
  onDelete,
  id,
  initialPosition,
  initialSize,
  initialDoc,
  initialZIndex,
  initialIsVisible,
  onUpdate
}, ref) => {
  const editorWrapperRef = useRef(null);
  const editorRef = useRef(null);
  const [position, setPosition] = useState(initialPosition || { x: 100, y: 100 });
  const [size, setSize] = useState(initialSize || { width: 800, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [resizeDirection, setResizeDirection] = useState('');
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isVisible, setIsVisible] = useState(initialIsVisible !== undefined ? initialIsVisible : true);
  const [zIndex, setZIndex] = useState(initialZIndex || 1);

  // 监听初始可见性变化
  useEffect(() => {
    setIsVisible(initialIsVisible);
  }, [initialIsVisible]);

  // 监听初始 z-index 变化
  useEffect(() => {
    setZIndex(initialZIndex);
  }, [initialZIndex]);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getContent: () => {
      if (editorRef.current) {
        return editorRef.current.getContent();
      }
      return null;
    },
    getEditor: () => editorRef.current,
    bringToFront: () => {
      setZIndex(prev => {
        const newZIndex = prev + 1;
        onUpdate(id, { zIndex: newZIndex });
        return newZIndex;
      });
    }
  }));

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
      onUpdate(id, { position: { x: newX, y: newY } });
    } else if (isResizing) {
      let newWidth = size.width;
      let newHeight = size.height;
      let newX = position.x;
      let newY = position.y;

      if (resizeDirection.includes('e')) {
        newWidth = size.width + (e.clientX - resizeStart.x);
      }
      if (resizeDirection.includes('s')) {
        newHeight = size.height + (e.clientY - resizeStart.y);
      }
      if (resizeDirection.includes('w')) {
        const deltaX = e.clientX - resizeStart.x;
        newWidth = size.width - deltaX;
        newX = position.x + deltaX;
      }
      if (resizeDirection.includes('n')) {
        const deltaY = e.clientY - resizeStart.y;
        newHeight = size.height - deltaY;
        newY = position.y + deltaY;
      }

      newWidth = Math.max(300, Math.min(newWidth, 1200));
      newHeight = Math.max(200, Math.min(newHeight, 800));

      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
      setResizeStart({ x: e.clientX, y: e.clientY });

      onUpdate(id, {
        size: { width: newWidth, height: newHeight },
        position: { x: newX, y: newY }
      });
    }
  }, [isDragging, isResizing, dragStart, size, position, resizeStart, resizeDirection, id, onUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeDirection('');
    document.body.style.cursor = 'default';
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (isCtrlPressed) {
      // 如果按住 CTRL 键并点击任何地方提升层级
      bringToFront();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault(); // 防止默认行为
    } else if (e.target.classList.contains('editor-header')) {
      // 正常情况下，点击头部进行拖拽
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault(); // 防止默认行为
    }
  }, [isCtrlPressed, position]);

  const handleResizeMouseDown = useCallback((direction, e) => {
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
    e.stopPropagation();
    document.body.style.cursor = `${direction}-resize`;
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Control') {
      setIsCtrlPressed(true);
    }
  }, []);

  const handleKeyUp = useCallback((e) => {
    if (e.key === 'Control') {
      setIsCtrlPressed(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [handleMouseMove, handleMouseUp, handleKeyDown, handleKeyUp]);

  const handleDelete = () => {
    onDelete(id);
  };

  const handleHide = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    onUpdate(id, { isVisible: newVisibility });
  };

  const bringToFront = () => {
    setZIndex(prev => {
      const newZIndex = prev + 1;
      onUpdate(id, { zIndex: newZIndex });
      return newZIndex;
    });
  };

  const handleHeaderClick = () => {
    bringToFront();
  };

  return (
    <div
      className={`editor-wrapper ${!isVisible ? 'hidden' : ''}`}
      ref={editorWrapperRef}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        cursor: isDragging ? 'grabbing' : (isCtrlPressed ? 'grab' : 'auto'),
        zIndex: zIndex
      }}
      onMouseDown={handleMouseDown}
      data-editor-id={id}
    >
      <div className="editor-header" onMouseDown={handleHeaderClick}>
        <button
          className="editor-button delete-button"
          onClick={handleDelete}
          title="删除编辑器"
          onMouseDown={(e) => e.stopPropagation()}
        >
          🗑️
        </button>
        <button
          className="editor-button hide-button"
          onClick={handleHide}
          title={isVisible ? "隐藏编辑器" : "显示编辑器"}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {isVisible ? '🙈' : '👁️'}
        </button>
      </div>
      <div className="editor-container">
        <Editor ref={editorRef} editorId={id} initialDoc={initialDoc} />
      </div>

      {/* 调整大小的手柄 */}
      <div
        className="resize-handle resize-e"
        onMouseDown={(e) => handleResizeMouseDown('e', e)}
      />
      <div
        className="resize-handle resize-s"
        onMouseDown={(e) => handleResizeMouseDown('s', e)}
      />
      <div
        className="resize-handle resize-se"
        onMouseDown={(e) => handleResizeMouseDown('se', e)}
      />
      <div
        className="resize-handle resize-n"
        onMouseDown={(e) => handleResizeMouseDown('n', e)}
      />
      <div
        className="resize-handle resize-w"
        onMouseDown={(e) => handleResizeMouseDown('w', e)}
      />
      <div
        className="resize-handle resize-ne"
        onMouseDown={(e) => handleResizeMouseDown('ne', e)}
      />
      <div
        className="resize-handle resize-sw"
        onMouseDown={(e) => handleResizeMouseDown('sw', e)}
      />
      <div
        className="resize-handle resize-nw"
        onMouseDown={(e) => handleResizeMouseDown('nw', e)}
      />
    </div>
  );
});

ResizableDraggableEditor.displayName = 'ResizableDraggableEditor';

export default ResizableDraggableEditor;
