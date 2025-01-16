// src/App.js
import React, { useState, useCallback, useRef, useEffect } from 'react';
import './App.css';
import ResizableDraggableEditor from './components/ResizableDraggableEditor/ResizableDraggableEditor';
import { v4 as uuidv4 } from 'uuid';
import { globalLinkState } from './prosemirror/bidirectionalLinkPlugin';

function App() {

  const isEditorEmpty = useCallback((editorId) => {
    const editorInstance = editorRefs.current[editorId];
    if (!editorInstance) return true;

    const content = editorInstance.getContent();
    if (!content || !content.doc) return true;

    // Check if the document only contains a single empty paragraph
    const doc = content.doc;
    if (doc.content && doc.content.length === 1) {
      const firstNode = doc.content[0];
      return firstNode.type === 'paragraph' && 
             (!firstNode.content || firstNode.content.length === 0);
    }
    
    return false;
  }, []);
  
  const handleEditorClick = useCallback((editorId) => {
    setEditors(prevEditors => {
      const editor = prevEditors.find(e => e.id === editorId);
      const maxZIndex = Math.max(...prevEditors.map(e => e.zIndex));
      
      // If toggling to hidden and content is empty, remove the editor
      if (editor.isVisible && isEditorEmpty(editorId)) {
        return prevEditors.filter(ed => ed.id !== editorId);
      }

      // Otherwise, just toggle visibility
      return prevEditors.map(ed => 
        ed.id === editorId 
          ? {
              ...ed,
              isVisible: !ed.isVisible,
              zIndex: maxZIndex + 1
            }
          : ed
      );
    });
  }, [isEditorEmpty]);

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

    // Regenerate highlight colors for existing highlights
    document.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { isDarkMode: theme === 'dark' }
    }));
    
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

  // Also handle empty editors when saving workflow
  const handleSave = useCallback(() => {
    setEditors(prevEditors => {
      // Filter out hidden empty editors before saving
      const filteredEditors = prevEditors.filter(editor => 
        editor.isVisible || !isEditorEmpty(editor.id)
      );

      const allEditorsData = filteredEditors.map(editor => {
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

      return filteredEditors; // Return filtered editors to update state
    });
  }, [isEditorEmpty]);

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

  // Update the handleUpdate function to handle empty editors when hidden
  const handleUpdate = useCallback((id, updates) => {
    setEditors(prevEditors => {
      const editor = prevEditors.find(e => e.id === id);
      
      // If updating visibility to hidden and content is empty, remove the editor
      if (updates.isVisible === false && isEditorEmpty(id)) {
        return prevEditors.filter(ed => ed.id !== id);
      }

      return prevEditors.map(editor => 
        editor.id === id 
          ? { ...editor, ...updates }
          : editor
      );
    });
  }, [isEditorEmpty]);

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

        {/* Directory-style Console */}
        <div className="console-header">
          <span>📁 Editor Instances</span>
        </div>

        <div className="console-body">
          <ul className="directory-list">
            {editors.map(editor => (
              <li key={editor.id} className="directory-item">
                <button 
                  onClick={() => handleEditorClick(editor.id)}
                  className="editor-id-button"
                  title={editor.isVisible ? "Click to hide editor" : "Click to show editor"}
                >
                  <span className="directory-icon">
                    {editor.isVisible ? '📄' : '👁️'}
                  </span>
                  <span className="directory-name">
                    {editor.id}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="link-status">
            {globalLinkState.waitingForPartner && 
              <span className="waiting-link">等待插入第二个链接...</span>
            }
          </p>
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
          onUpdate={handleUpdate}
          ref={instance => { editorRefs.current[editor.id] = instance; }}
        />
      ))}
    </div>
  );
}

export default App;
