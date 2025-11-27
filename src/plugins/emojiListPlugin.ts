import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginSpec,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import { EmojiWidget } from './emoji';

class EmojiListPlugin implements PluginValue {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    // 仅在文档更改或视图范围更改时重新构建装饰
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  destroy() {}

  buildDecorations(view: EditorView): DecorationSet {
    // 先创建一个 RangeSetBuilder 来收集装饰
    const builder = new RangeSetBuilder<Decoration>();

    console.info('Building decorations for emoji list plugin');
    console.log(view);

    // 遍历可见范围
    for (let { from, to } of view.visibleRanges) {
      // 迭代语法树
      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node) {
          console.log('Visiting node:', node.type.name, node.from, node.to);

          if (node.type.name.startsWith('list')) {
            // Position of the '-' or the '*'.
            const listCharFrom = node.from - 2;

            // 添加 EmojiWidget 装饰
            builder.add(
              listCharFrom,
              listCharFrom + 1,
              Decoration.replace({
                widget: new EmojiWidget()
              })
            );

            // 添加高亮装饰
            builder.add(
              listCharFrom,
              listCharFrom + 5,
              Decoration.mark({
                class: 'test-highlight'
              })
            );
          }
        },
      });
    }

    return builder.finish();
  }
}

const pluginSpec: PluginSpec<EmojiListPlugin> = {
  decorations: (value: EmojiListPlugin) => value.decorations,
};

export const emojiListPlugin = ViewPlugin.fromClass(
  EmojiListPlugin,
  pluginSpec
);