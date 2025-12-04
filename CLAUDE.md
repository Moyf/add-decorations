# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- 这是一款 Obsidian 插件，请遵循 @Agents.md 文件中的开发规范

## Project Overview

Task Decorator is an Obsidian community plugin that adds visual decorations to tasks to help users focus. The plugin uses CodeMirror 6 decorations to highlight a configurable number of tasks and fade/blur the rest.

## Core Features

- **Task Highlighting**: Highlights a configurable number of tasks (default: 3) with background colors
- **Task Fading**: Tasks beyond the limit are faded and blurred to reduce distraction (can be toggled)
- **Completed Task Styling**: Child items under completed tasks get special styling (strikethrough, reduced opacity)
- **Real-time Updates**: Settings changes apply instantly without restart
- **Status Bar Toggle**: Quick toggle button in status bar to enable/disable task fading
- **Command Palette Support**: Command to toggle task fade effect

## Development Commands

### Setup
```bash
npm install
```

### Development
```bash
npm run dev      # Watch mode with source maps
```

### Production Build
```bash
npm run build    # Type check and minified production build
```

### Linting
```bash
npm run lint     # Run ESLint
```

## Architecture Overview

### Plugin Structure

The plugin follows a modular architecture with clear separation of concerns:

1. **Entry Point**: `src/main.ts`
   - Manages plugin lifecycle (onload, onunload)
   - Initializes settings and registers components
   - Creates shared settings object for cross-component communication

2. **Settings Management**: `src/settings.ts`
   - Defines `DecoratorPluginSettings` interface
   - Provides `DecorationSettingTab` for UI settings
   - Handles settings persistence via `loadData()`/`saveData()`

3. **Core Decoration Logic**: `src/plugins/taskMarkerPlugin.ts`
   - Implements CodeMirror 6 ViewPlugin
   - Uses syntax tree traversal to identify tasks
   - Applies decorations based on task position and completion status
   - Key logic:
     - Resets task counter at each header
     - Tracks task completion state by indentation level
     - Fades tasks beyond `displayTaskNumber` when `enableTaskFade` is true
     - Applies child styling when parent tasks are completed

### Key Design Patterns

#### Shared Settings Object
The plugin uses a shared object pattern to communicate settings from the main plugin to the CodeMirror plugin:

```typescript
public sharedSettings: { current: DecoratorPluginSettings } = {
  current: {} as DecoratorPluginSettings
};
```

This allows the CodeMirror plugin to access the latest settings without re-registration.

#### Decoration Strategy
- **Task markers**: Uses numbered CSS classes (`task-num-1`, `task-num-2`, etc.) for first N tasks
- **Faded tasks**: Uses `task-marker-fade` class for tasks beyond limit
- **Child items**: Uses `completed-task-child` and `completed-task-child-list` for styling
- **Hover effects**: Tasks become more visible on hover/active

#### State Management
The plugin maintains state at multiple levels:
- `currentTaskNumber`: Resets at each header, increments per task
- `completedTasksByLevel`: Tracks completion status by indentation level
- `fadedTasksByLevel`: Tracks fade status for child item propagation

### CSS Architecture (`styles.css`)
- Task highlighting uses background colors with opacity
- Task fading uses `opacity` and `filter: blur()`
- Child items inherit styling based on parent state
- Hover states improve readability for faded/completed items

## Building and Release

### Build Process
- **Bundler**: esbuild (configured in `esbuild.config.mjs`)
- **Entry**: `src/main.ts`
- **Output**: `main.js` at plugin root
- **Externals**: Obsidian APIs and built-in Node modules
- **Format**: CommonJS for compatibility

### Release Artifacts
Required files for distribution:
- `main.js` (bundled plugin code)
- `manifest.json` (plugin metadata)
- `styles.css` (styling - optional but recommended)

### Version Management
- Version format: Semantic versioning (`x.y.z`)
- Version in `manifest.json` must match GitHub release tag
- Update `versions.json` to map plugin versions to minimum Obsidian version

## Settings

The plugin has two main settings:

1. **Display task number** (`displayTaskNumber`)
   - Type: number
   - Default: 3
   - Description: How many tasks to highlight before fading

2. **Enable task fade effect** (`enableTaskFade`)
   - Type: boolean
   - Default: true
   - Description: When enabled, tasks beyond the display limit will be faded

## User Interface

### Settings Tab
Located in **Settings → Community plugins → Task Decorator**
- Toggle switch for enabling/disabling task fade
- Text input for configuring the number of highlighted tasks

### Status Bar Item
- Shows eye/eye-off icon indicating current state
- Click to toggle task fade effect
- Tooltip shows current action

### Command Palette
- Command: "Toggle task fade effect"
- Quick way to toggle the fade effect without mouse

## Code Style Guidelines

Based on the project configuration and patterns observed:

- TypeScript with strict mode
- Keep files small and focused (current files are well-sized)
- Use async/await instead of promise chains
- Register all event listeners and intervals with `register*` helpers
- Use clear module boundaries
- Follow existing patterns for new features

## Testing

Currently manual testing only:
1. Copy `main.js`, `manifest.json`, and `styles.css` to test vault
2. Reload Obsidian
3. Enable plugin in settings
4. Test in markdown files with various task configurations

## Performance Considerations

- Decorations are rebuilt only on document changes or viewport changes
- Uses efficient RangeSetBuilder for collecting decorations
- Avoids unnecessary work by checking node types before processing
- Settings updates trigger targeted re-renders, not full reloads
