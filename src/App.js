// src/App.js
import React, { useState, useCallback, useRef, useEffect } from 'react';
import './App.css';
import ResizableDraggableEditor from './components/ResizableDraggableEditor/ResizableDraggableEditor';
import { v4 as uuidv4 } from 'uuid';
import { globalLinkState } from './prosemirror/bidirectionalLinkPlugin';

function App() {
  const [editors, setEditors] = useState([
    {
      id: uuidv4(),
      position: { x: 100, y: 100 },
      size: { width: 800, height: 400 },
      isVisible: true,
      doc: null,
      zIndex: 1
    }
  ]);

  const editorRefs = useRef({});

  // Theme state: 'dark' or 'light'
  const [theme, setTheme] = useState('dark');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setTheme(savedTheme);
    }
  }, []);

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Function to toggle theme
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  // Function to add a new editor instance
  const addEditor = useCallback((position, size) => {
    const newEditor = {
      id: uuidv4(),
      position,
      size,
      isVisible: true,
      doc: null,
      zIndex: editors.length + 1
    };
    setEditors(prevEditors => [...prevEditors, newEditor]);
  }, [editors]);

  // Function to delete an editor instance
  const deleteEditor = useCallback((id) => {
    setEditors(prevEditors => prevEditors.filter(editor => editor.id !== id));
    delete editorRefs.current[id];
  }, []);

  // Function to update editor properties
  const updateEditor = useCallback((id, updates) => {
    setEditors(prevEditors => 
      prevEditors.map(editor => 
        editor.id === id ? { ...editor, ...updates } : editor
      )
    );
  }, []);

  // Handle navigateToLink event
  const handleNavigateToLink = useCallback(async (event) => {
    console.log("Received navigate event:", event.detail);
    const { toEditorId, partnerId } = event.detail;
    
    const targetEditor = editorRefs.current[toEditorId];
    if (!targetEditor) return;

    // Update zIndex and position
    setEditors(prevEditors => {
      const highestZIndex = Math.max(...prevEditors.map(editor => editor.zIndex)) + 1;
      return prevEditors.map(editor => 
        editor.id === toEditorId 
          ? {
              ...editor,
              isVisible: true,
              zIndex: highestZIndex,
              position: {
                x: Math.max(0, (window.innerWidth - editor.size.width) / 2),
                y: Math.max(0, (window.innerHeight - editor.size.height) / 2)
              }
            }
          : editor
      );
    });

    // Handle DOM operations
    setTimeout(() => {
      const editorWrapper = document.querySelector(`[data-editor-id="${toEditorId}"]`)?.closest('.editor-wrapper');
      if (!editorWrapper) return;

      editorWrapper.classList.remove('hidden');
      editorWrapper.classList.add('transitioning');

      editorWrapper.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });

      editorWrapper.style.boxShadow = '0 0 0 2px #4299e1';

      setTimeout(() => {
        editorWrapper.style.boxShadow = '';
        editorWrapper.classList.remove('transitioning');
        
        const editorInstance = targetEditor.getEditor();
        if (editorInstance) {
          editorInstance.scrollToLink(partnerId);
        }
      }, 500);
    }, 0);
  }, []);

  const handleUpdateFirstLink = useCallback((event) => {
    console.log("Received update link event:", event.detail);
    const { editorId, linkId, partnerId, targetEditorId } = event.detail;
    const editorInstance = editorRefs.current[editorId]?.getEditor();
    if (editorInstance) {
      editorInstance.updateLinkPartner(linkId, partnerId, targetEditorId);
    }
  }, []);

  const handleSave = useCallback(() => {
    setEditors(prevEditors => {
      const allEditorsData = prevEditors.map(editor => {
        const editorInstance = editorRefs.current[editor.id];
        let content = null;

        if (editorInstance) {
          content = editorInstance.getContent();
        }

        return {
          ...editor,
          doc: content?.doc || null
        };
      });

      // Save data
      const workflow = { editors: allEditorsData };
      const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'workflow.json';
      link.click();
      URL.revokeObjectURL(url);

      return prevEditors; // Return original state as we are just reading data
    });
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    if (e.ctrlKey && e.key === 'q') {
      e.preventDefault();
      // Implement insert bidirectional link functionality here
      // For example, emit an event or call a function
      // Placeholder implementation:
      console.log('CTRL+Q pressed: Insert bidirectional link');
      // You can add more logic here based on your bidirectional link implementation
    }
  }, [handleSave]);

  const handleDelete = useCallback((id) => {
    setEditors(prevEditors => prevEditors.filter(editor => editor.id !== id));
    delete editorRefs.current[id];
  }, []);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    setEditors(prevEditors => {
      const maxZIndex = prevEditors.length > 0 
        ? Math.max(...prevEditors.map(editor => editor.zIndex)) 
        : 1;
      const newEditor = {
        id: uuidv4(),
        position: { x: e.clientX - 400, y: e.clientY - 200 },
        size: { width: 800, height: 400 },
        isVisible: true,
        doc: null,
        zIndex: maxZIndex + 1
      };
      return [...prevEditors, newEditor];
    });
  }, []);

  const handleUpdate = useCallback((id, updates) => {
    setEditors(prevEditors => 
      prevEditors.map(editor => 
        editor.id === id 
          ? { ...editor, ...updates }
          : editor
      )
    );
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || file.type !== 'application/json') {
      alert('请拖放一个 JSON 文件。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workflow = JSON.parse(event.target.result);
        if (workflow.editors && Array.isArray(workflow.editors)) {
          const loadedEditors = workflow.editors.map(editorData => ({
            id: editorData.id || uuidv4(),
            position: editorData.position || { x: 100, y: 100 },
            size: editorData.size || { width: 800, height: 400 },
            isVisible: editorData.isVisible !== undefined ? editorData.isVisible : true,
            doc: editorData.doc || null,
            zIndex: editorData.zIndex || 1
          }));
          setEditors(loadedEditors);
        } else {
          alert('无效的工作流文件。');
        }
      } catch (error) {
        console.error('Failed to load workflow:', error);
        alert('无法解析 JSON 文件。');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, [handleDrop, handleDragOver]);

  useEffect(() => {
    document.addEventListener('navigateToLink', handleNavigateToLink);
    document.addEventListener('updateFirstLink', handleUpdateFirstLink);

    return () => {
      document.removeEventListener('navigateToLink', handleNavigateToLink);
      document.removeEventListener('updateFirstLink', handleUpdateFirstLink);
    };
  }, [handleNavigateToLink, handleUpdateFirstLink]);

  useEffect(() => {
    // Clean up unused editor references
    Object.keys(editorRefs.current).forEach(id => {
      if (!editors.find(editor => editor.id === id)) {
        delete editorRefs.current[id];
      }
    });
  }, [editors]);

  // Handle command input (optional)
  const handleCommand = (e) => {
    if (e.key === 'Enter') {
      const command = e.target.value.trim();
      // Implement command handling logic here
      console.log(`Command entered: ${command}`);
      e.target.value = '';
    }
  };

  return (
    <div className={`App ${theme}`} onContextMenu={handleContextMenu}>
      <header className="App-header">
        <h1>ProseMirror Editor</h1>
      </header>

      <div className="content-display">
        {/* Theme Switcher Buttons */}
        <div className="theme-switcher">
          <button
            onClick={toggleTheme}
            className="theme-button"
            title="Toggle Theme"
            aria-label="Toggle between Day and Dark mode"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Console Header */}
        <div className="console-header">
          <span>💻 Console</span>
        </div>

        {/* Console Body */}
        <div className="console-body">
          <h2>Editor Instances:</h2>
          <ul>
            {editors.map(editor => (
              <li key={editor.id}>Editor ID: {editor.id}</li>
            ))}
          </ul>
          <p>右键点击页面任意位置以创建新的编辑器实例。</p>
          <p>按下 <strong>CTRL+S</strong> 保存所有编辑器内容为 JSON 工作流文件。</p>
          <p>将 JSON 文件拖放到浏览器窗口中以加载编辑器状态。</p>
          <p>使用 <strong>CTRL+Q</strong> 在文本中插入双向链接{globalLinkState.waitingForPartner ? ' (等待插入第二个链接...)' : ''}。</p>
        </div>

        {/* Command Input (Optional) */}
        <div className="console-input">
          <input
            type="text"
            placeholder="Enter command..."
            onKeyDown={handleCommand}
            aria-label="Command input"
          />
        </div>
      </div>

      {/* Render Editor Instances */}
      {editors.map(editor => (
        <ResizableDraggableEditor
          key={editor.id}
          id={editor.id}
          initialPosition={editor.position}
          initialSize={editor.size}
          initialDoc={editor.doc}
          initialZIndex={editor.zIndex}
          initialIsVisible={editor.isVisible}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          ref={instance => { editorRefs.current[editor.id] = instance; }}
        />
      ))}
    </div>
  );
}

export default App;
