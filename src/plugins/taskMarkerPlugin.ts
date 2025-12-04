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
import type { App } from 'obsidian';
import { MarkdownView } from 'obsidian';

// 获取插件设置
import { DecoratorPluginSettings } from '../settings';


class TaskMarkerPlugin implements PluginValue {
  decorations: DecorationSet;
  settingsRef: { current: DecoratorPluginSettings };
  app?: App;

  constructor(view: EditorView, settingsRef: { current: DecoratorPluginSettings }, app?: App) {
    this.settingsRef = settingsRef;
    this.app = app;
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

    // 从当前设置获取 numberLimit 和 enableTaskFade
    const numberLimit = this.settingsRef.current.displayTaskNumber;
    const enableTaskFade = this.settingsRef.current.enableTaskFade;

    // 检查文件元数据是否应该显示所有任务（禁用模糊效果）
    let shouldShowAllTasks = false;
    try {
      if (this.app) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        const activeFile = activeView?.file;

        if (activeFile) {
          const metadata = this.app.metadataCache.getFileCache(activeFile);
          const frontmatter = metadata?.frontmatter;

          const propName: string = this.settingsRef.current.metadataProperty;
          const propValue: string | boolean = this.settingsRef.current.metadataValue;

          if (frontmatter && frontmatter[propName] !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const fileValue = frontmatter[propName];

            console.debug('Checking file metadata for property:', propName, 'with value:', fileValue);
            // 检查是否为数组（列表）
            if (Array.isArray(fileValue)) {
              // 如果是列表，检查是否包含设置的值
              shouldShowAllTasks = fileValue.some((item: unknown) => String(item) === String(propValue));
            } else {
              // 如果是单个值，直接比较
              shouldShowAllTasks = String(fileValue) === String(propValue);
            }

            console.debug('Should show all tasks based on metadata:', shouldShowAllTasks);
          }
        }
      }
    } catch (error) {
      console.debug('Error checking file metadata:', error);
    }

    // 如果元数据指示显示所有任务，则禁用淡化效果
    const actualEnableTaskFade = enableTaskFade && !shouldShowAllTasks;

    let currentTaskNumber = 0;
    // 用数组跟踪每个缩进级别的任务完成状态
    const completedTasksByLevel: boolean[] = [];
    // 用数组跟踪每个缩进级别的任务是否为淡化状态
    const fadedTasksByLevel: boolean[] = [];
    // 用数组跟踪每个缩进级别的任务是否为最后一项任务
    const lastTasksByLevel: boolean[] = [];

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
            lastTasksByLevel.length = 0; // 清空最后一项任务状态
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
            
            // 检查任务内容是否为空（只有任务标记，没有实际内容）
            const taskRegex = /^\s*-\s+\[[xX\s]\]\s*(.*)$/;
            const taskContentMatch = taskRegex.exec(lineText);
            const hasContent = taskContentMatch?.[1] ? taskContentMatch[1].trim().length > 0 : false;


            // 判断当前任务是否为淡化状态（使用 actualEnableTaskFade）
            const isFaded = currentTaskNumber > numberLimit && actualEnableTaskFade;
            fadedTasksByLevel[indentLevel] = isFaded;
            fadedTasksByLevel.splice(indentLevel + 1); // 清除更深层级的淡化状态

            // 判断当前任务是否为最后一项任务（在限制内）
            const isLastTask = currentTaskNumber === numberLimit && hasContent;
            lastTasksByLevel[indentLevel] = isLastTask;
            lastTasksByLevel.splice(indentLevel + 1); // 清除更深层级的状态

            const rangeFrom: number = node.from;
            const rangeTo: number = node.to;

            let className = '';
            if (currentTaskNumber < numberLimit && hasContent) {
              // 前 N-1 个非空任务：正常高亮
              className = `task-marker-highlight task-num-${String(currentTaskNumber)}`;
            } else if (currentTaskNumber === numberLimit && hasContent) {
              // 最后一个非空任务（在限制内）：特殊高亮
              className = `task-marker-highlight task-num-${String(currentTaskNumber)} task-num-last`;
            } else if (currentTaskNumber > numberLimit && actualEnableTaskFade) {
              // 超过限制的任务：模糊
              className = 'task-marker-fade';
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

            // 仅当有样式类时才添加高亮装饰
            if (className) {
              builder.add(
                rangeFrom,
                rangeTo,
                Decoration.mark({
                  class: className
                })
              );
            }
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

            // 检查是否有父级任务为最后一项任务（任何更浅的层级）
            let hasLastTaskParent = false;
            for (let i = 0; i < indentLevel; i++) {
              if (lastTasksByLevel[i] === true) {
                hasLastTaskParent = true;
                break;
              }
            }

            if (hasCompletedParent) {
              childClasses.push('completed-task-child-list');
            }
            if (hasFadedParent) {
              childClasses.push('task-marker-fade-child');
            }
            if (hasLastTaskParent) {
              childClasses.push('task-num-last-child');
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

export function createTaskMarkerPlugin(settingsRef: { current: DecoratorPluginSettings }, app?: App) {
  return ViewPlugin.fromClass(
    class extends TaskMarkerPlugin {
      constructor(view: EditorView) {
        super(view, settingsRef, app ?? undefined);
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