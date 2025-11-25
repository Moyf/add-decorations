import {
    ViewUpdate,
    PluginValue,
    EditorView,
    ViewPlugin,
} from "@codemirror/view";

class ExamplePlugin implements PluginValue {
    constructor(public view: EditorView) {}
    update(update: ViewUpdate) {
        // Handle updates to the editor view here
    }

    destroy() {
        // Clean up resources when the plugin is destroyed
    }
}

export const examplePlugin = ViewPlugin.fromClass(ExamplePlugin);