import {
    ViewUpdate,
    PluginValue,
    EditorView,
    ViewPlugin,
} from "@codemirror/view";

class LineHighlighter implements PluginValue {
    currentLine: number | null;

    constructor(public view: EditorView) {
        this.view = view;
        this.currentLine = null;
    }

    update(update: ViewUpdate) {
        const currentLine = this.view.state.doc.lineAt(
            this.view.state.selection.main.head
        ).number;

        console.log("Current line number:", currentLine);
        console.log(this.view.state.selection);

        if (this.currentLine !== currentLine) {
            this.currentLine = currentLine;
            this.highlightLine(currentLine);
        }
    }

    highlightLine(lineNumber: number): void {
        this.removeHighlight();
    }

    removeHighlight(): void {
        // Logic to remove existing line highlight
    }

    destroy(): void {
        this.removeHighlight();
    }


}

export const lineHighlighter = ViewPlugin.fromClass(LineHighlighter);
