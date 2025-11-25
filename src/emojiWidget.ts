import { EditorView, WidgetType } from '@codemirror/view';

// 以下示例定义了一个小组件，该小组件返回 HTML 元素 <span>👉</span>。稍后将使用此小组件。
export class EmojiWidget extends WidgetType {
  toDOM(view: EditorView): HTMLElement {
    const div = document.createElement('span');

    div.innerText = '👉';

    return div;
  }
}
