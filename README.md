# Bible Canvas

Bible Canvas is a cross-platform desktop application built with Electron, React, TypeScript, and Tailwind CSS. It combines a versatile Bible reader with an infinite canvas for taking notes and studying the Scriptures dynamically.

## Features

- **Integrated Bible Reader**: Browse comfortably through all 66 canonical books, navigate easily between **chapters** and **verses**.
- **Infinite Canvas (Drawboard) for Annotations**: Built on top of TLDraw, the canvas provides an infinite drawboard workspace where you can freely jot down thoughts, draw, create diagrams, and organize your studies.
- **Drag and Drop Verses**: Seamlessly select and drag verses straight from the reader and drop them onto the canvas as sticky notes. Full support for mouse, touch, and digital pen input.
- **Bible Version Management**: Easily import new Bible translations/versions from JSON files and delete the ones you no longer need.
- **Local Persistence**: Uses SQLite to store your downloaded versions and canvas annotations locally, allowing complete offline access.

### Download Bible JSON Files

You can download various Bible versions in JSON format to import into Bible Canvas from the following repository:
👉 [https://github.com/damarals/biblias](https://github.com/damarals/biblias)

## Getting Started

### Installation via Installer (.exe)

For the easiest setup, especially if you just want to use the application without modifying the code, download our pre-built installer:

1. Go to the [Releases](https://github.com/marcosduarte-dev/BibleCanvas/releases) page of this repository. (Note: Ensure releases are published).
2. Download the latest `.exe` installer (e.g., `Bible.Canvas Setup X.Y.Z.exe`).
3. Run the downloaded `.exe` file and follow the on-screen installation instructions. Bible Canvas will be installed on your machine and a shortcut will be created.

### Development Setup (From Source)

If you wish to run from source code or contribute:

#### Prerequisites
- Node.js (v18 or above recommended)
- npm or yarn

1. Clone the repository and navigate into the directory:
```bash
git clone https://github.com/marcosduarte-dev/BibleCanvas.git
cd BibleCanvas
```
2. Install dependencies:
```bash
npm install
```

#### Development Commands
- `npm run dev`: Starts the React app locally for UI development (listens on `localhost:4444`).
- `npm run start`: Builds the React and Electron apps, and opens the Electron desktop application.

#### Building for Production
- `npm run package`: Builds the application and packages it into a distributable installer (`.exe` for Windows) using electron-builder. The output will be in the `release/` folder.

## Technologies Used
- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TLDraw](https://tldraw.dev/)
- [SQLite](https://sqlite.org/) via sql.js
