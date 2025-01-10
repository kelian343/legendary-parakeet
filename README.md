# ProseMirror Multi-Editor Project

![License](https://img.shields.io/badge/license-MIT-blue.svg)

A multi-editor management application built with **React** and **ProseMirror**. This project allows users to create, manage, and link multiple rich-text editors in a single interface. It supports features like drag-and-drop, resizing, bidirectional linking, and saving/loading workflows.

---

## Features

- **Multiple Editors**: Create and manage multiple editor instances.
- **Drag and Resize**: Drag editors around and resize them dynamically.
- **Bidirectional Links**: Create links between text in the same or different editors and navigate between them.
- **Save/Load Workflow**: Save the state of all editors as a JSON file and load it later.
- **Keyboard Shortcuts**:
  - `Ctrl + S`: Save the current workflow.
  - `Ctrl + Q`: Insert a bidirectional link.
- **Right-Click to Create**: Right-click anywhere on the page to create a new editor instance.

---

## Project Structure
      src/
      ├── components/
      │ ├── Editor/
      │ │ ├── Editor.js
      │ │ └── Editor.module.css
      │ └── ResizableDraggableEditor/
      │ ├── ResizableDraggableEditor.js
      │ └── ResizableDraggableEditor.css
      ├── prosemirror/
      │ ├── schema.js
      │ ├── plugins.js
      │ ├── bidirectionalLinkPlugin.js
      │ └── bidirectionalLink.css
      ├── App.js
      └── App.css


### Key Files
- **`App.js`**: The main component that manages the state of all editors.
- **`Editor.js`**: The core editor component built with ProseMirror.
- **`ResizableDraggableEditor.js`**: A wrapper component that makes editors resizable and draggable.
- **`schema.js`**: Defines the ProseMirror schema for the editor.
- **`plugins.js`**: Configures ProseMirror plugins (e.g., history, keymap).
- **`bidirectionalLinkPlugin.js`**: Implements bidirectional linking functionality.

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/prosemirror-multi-editor.git
   cd prosemirror-multi-editor

* Install dependencies:
   ```bash
   npm install
* Start the development server:
   ```bash
   npm start

* Open your browser and navigate to http://localhost:3000.

## Usage

1. **Create a New Editor**:
   - Right-click anywhere on the page to create a new editor instance.

2. **Edit Content**:
   - Type in any editor to add or modify content.

3. **Create Bidirectional Links**:
   - Select some text and press `Ctrl + Q` to create the first link.
   - Select another piece of text and press `Ctrl + Q` again to create the second link and establish a bidirectional connection.

4. **Navigate Between Links**:
   - Click on a link to navigate to its partner link in the same or another editor.

5. **Save Workflow**:
   - Press `Ctrl + S` to save the current state of all editors as a JSON file.

6. **Load Workflow**:
   - Drag and drop a previously saved JSON file into the browser window to load the workflow.

7. **Delete or Hide Editors**:
   - Use the delete (🗑️) and hide (🙈) buttons in the editor header to manage editor instances.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Contributing

Contributions are welcome! If you'd like to contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes.
4. Submit a pull request.

---

## Acknowledgments

- [ProseMirror](https://prosemirror.net/) for providing a powerful and flexible rich-text editing framework.
- [React](https://reactjs.org/) for building the user interface.

---

## Author

👤 **Kelian**

- GitHub: [@Kelian](https://github.com/Kelian)
- Year: 2025

---

Enjoy using the ProseMirror Multi-Editor Project! 🚀