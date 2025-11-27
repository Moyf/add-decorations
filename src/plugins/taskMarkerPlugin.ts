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

// 获取插件设置
import { DecoratorPluginSettings } from "../settings";


class TaskMarkerPlugin implements PluginValue {
  decorations: DecorationSet;
  settingsRef: { current: DecoratorPluginSettings };

  constructor(view: EditorView, settingsRef: { current: DecoratorPluginSettings }) {
    this.settingsRef = settingsRef;
    console.debug('TaskMarkerPlugin initialized with settings, number:', this.settingsRef.current.displayTaskNumber);
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    // 仅在文档更改或视图范围更改时重新构建装饰
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  destroy() {
    // 清理资源
  }

  buildDecorations(view: EditorView): DecorationSet {
    // 先创建一个 RangeSetBuilder 来收集装饰
    const builder = new RangeSetBuilder<Decoration>();
    
    // 从当前设置获取 numberLimit
    const numberLimit = this.settingsRef.current.displayTaskNumber;

    let currentTaskNumber = 0;

    // 遍历可见范围
    for (let { from, to } of view.visibleRanges) {
      // 迭代语法树
      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node) {
        //   console.log('Visiting node:', node.type.name, node.from, node.to);

          if (node.type.name.startsWith('HyperMD-header')) {
            // reset task number on new header
            currentTaskNumber = 0;
          }

          if (node.type.name.includes('HyperMD-task-line')) {
            currentTaskNumber += 1;

            const rangeFrom: number = node.from;
            const rangeTo: number = node.to;

            let className = 'task-marker-fade';
            if (currentTaskNumber <= numberLimit) {
              className = `task-marker-highlight task-num-${String(currentTaskNumber)}`;
            }

            // 添加高亮装饰
            builder.add(
              rangeFrom,
              rangeTo,
              Decoration.mark({
                class: className
              })
            );
          }
        },
      });
    }

    return builder.finish();
  }
}

const pluginSpec: PluginSpec<TaskMarkerPlugin> = {
  decorations: (value: TaskMarkerPlugin) => value.decorations,
};

export function createTaskMarkerPlugin(settingsRef: { current: DecoratorPluginSettings }) {
  return ViewPlugin.fromClass(
    class extends TaskMarkerPlugin {
      constructor(view: EditorView) {
        super(view, settingsRef);
      }
    },
    pluginSpec
  );
}

// 为了向后兼容，导出一个默认插件
const defaultSettings = { current: { displayTaskNumber: 3 } as DecoratorPluginSettings };
export const taskMarkerPlugin = ViewPlugin.fromClass(
  class extends TaskMarkerPlugin {
    constructor(view: EditorView) {
      super(view, defaultSettings);
    }
  },
  pluginSpec
);