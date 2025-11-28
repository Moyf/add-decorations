/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
} from '@codemirror/view';

// 获取插件设置
import { DecoratorPluginSettings } from '../settings';


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
    // 用数组跟踪每个缩进级别的任务完成状态
    const completedTasksByLevel: boolean[] = [];
    // 用数组跟踪每个缩进级别的任务是否为淡化状态
    const fadedTasksByLevel: boolean[] = [];

    // 遍历可见范围
    for (let { from, to } of view.visibleRanges) {
      // 迭代语法树
      const tree = syntaxTree(view.state);
      if (!tree) continue;
      
      tree.iterate({
        from,
        to,
        enter(node) {
        //   console.debug('Visiting node:', {
        //     name: node.type.name,
        //     from: node.from,
        //     to: node.to,
        //     text: view.state.doc.sliceString(node.from, node.to)
        //   });

          if (node.type.name.startsWith('HyperMD-header')) {
            // reset task number on new header
            currentTaskNumber = 0;
            completedTasksByLevel.length = 0; // 清空所有级别状态
            fadedTasksByLevel.length = 0; // 清空淡化状态
          }

          // 处理任务行
          if (node.type.name.includes('HyperMD-task-line')) {
            currentTaskNumber += 1;
            
            // 检查任务是否已完成
            const lineText = view.state.doc.sliceString(node.from as number, node.to as number);
            const isCompleted = lineText.includes('[x]') || lineText.includes('[X]');
            
            // 计算缩进级别（通过计算前导空格或制表符）
            const leadingWhitespace = /^(\s*)/.exec(lineText)?.[1] ?? '';
            const indentLevel = Math.floor(leadingWhitespace.length / 2); // 假设每级缩进2个空格
            
            // 更新当前级别的完成状态，并清除更深层级的状态
            completedTasksByLevel[indentLevel] = isCompleted;
            completedTasksByLevel.splice(indentLevel + 1); // 清除更深层级的状态
            
            // 判断当前任务是否为淡化状态
            const isFaded = currentTaskNumber > numberLimit;
            fadedTasksByLevel[indentLevel] = isFaded;
            fadedTasksByLevel.splice(indentLevel + 1); // 清除更深层级的淡化状态

            const rangeFrom: number = node.from;
            const rangeTo: number = node.to;

            let className = 'task-marker-fade';
            if (currentTaskNumber <= numberLimit) {
              className = `task-marker-highlight task-num-${String(currentTaskNumber)}`;
            }

            // 检查是否有父级任务已完成（任何更浅的层级）
            let hasCompletedParent = false;
            for (let i = 0; i < indentLevel; i++) {
              if (completedTasksByLevel[i] === true) {
                hasCompletedParent = true;
                break;
              }
            }

            if (hasCompletedParent) {
              className += ' completed-task-child';
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

          // 处理普通列表项（非任务）
          if (node.type.name.includes('HyperMD-list-line') && !node.type.name.includes('task')) {
            const lineText = view.state.doc.sliceString(node.from as number, node.to as number);
            const leadingWhitespace = /^(\s*)/.exec(lineText)?.[1] ?? '';
            const indentLevel = lineText.startsWith('\t') ? (/^(\t*)/.exec(lineText)?.[1]?.length ?? 0) : Math.floor(leadingWhitespace.length / 2);

            let childClasses = [];

            // 检查是否有父级任务已完成（任何更浅的层级）
            let hasCompletedParent = false;
            for (let i = 0; i < indentLevel; i++) {
              if (completedTasksByLevel[i] === true) {
                hasCompletedParent = true;
                break;
              }
            }

            // 检查是否有父级任务为淡化状态（任何更浅的层级）
            let hasFadedParent = false;
            for (let i = 0; i < indentLevel; i++) {
              if (fadedTasksByLevel[i] === true) {
                hasFadedParent = true;
                break;
              }
            }

            if (hasCompletedParent) {
              childClasses.push('completed-task-child-list');
            } 
            if (hasFadedParent) {
              childClasses.push('task-marker-fade-child');
            }

            const childClassesFinal = childClasses.join(' ');

            // console.log('List item at level', indentLevel, 'hasCompletedParent:', hasCompletedParent, 'hasFadedParent:', hasFadedParent, 'applying classes:', childClassesFinal);

            if (childClasses.length > 0) {
              builder.add(
                node.from as number,
                node.to as number,
                Decoration.mark({
                  class: childClassesFinal
                })
              );
            }
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