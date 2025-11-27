import { MarkdownView, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, DecoratorPluginSettings, DecorationSettingTab } from './settings';
import { createTaskMarkerPlugin } from './plugins/taskMarkerPlugin';

export default class DecoratorPlugin extends Plugin {
	settings: DecoratorPluginSettings;
	private taskMarkerExtension: ReturnType<typeof createTaskMarkerPlugin> | null = null;
	// 创建一个共享的设置对象，用于在扩展中引用
	public sharedSettings: { current: DecoratorPluginSettings } = { current: {} as DecoratorPluginSettings };

	async onload() {
		await this.loadSettings();

		// Register the line highlighter as a CodeMirror editor extension
		// this.registerEditorExtension([lineHighlighter]);
		// this.registerEditorExtension([emojiListPlugin]);
		this.loadTaskMarkerExtension();

		// This creates an icon in the left ribbon.
		// this.addRibbonIcon('dice', 'Sample', (evt: MouseEvent) => {
		// 	new Notice('This is a notice!');
		// });

		// 可选：添加状态栏显示
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText(`Tasks: ${String(this.settings.displayTaskNumber)}`);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new DecorationSettingTab(this.app, this));

		// 如果需要全局 DOM 事件监听，可以在这里添加
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => { ... });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

	}

	onunload() {
		// 清理资源
		this.taskMarkerExtension = null;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<DecoratorPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	loadTaskMarkerExtension() {
		// 初始化共享设置
		this.sharedSettings.current = this.settings;
		// 创建扩展，传递共享设置引用
		this.taskMarkerExtension = createTaskMarkerPlugin(this.sharedSettings);
		this.registerEditorExtension([this.taskMarkerExtension]);
	}

	reloadTaskMarkerExtension() {
		// 更新共享设置，这样已注册的扩展会自动使用新设置
		this.sharedSettings.current = this.settings;
		console.debug('Updated shared settings:', this.settings);

		// 触发编辑器重新渲染以应用新设置
		setTimeout(() => {
			this.app.workspace.iterateAllLeaves((leaf) => {
				if (leaf.view.getViewType() === 'markdown') {
					const markdownView = leaf.view as MarkdownView;
					// 触发编辑器内容变化事件来强制重新计算装饰
					const editor = markdownView?.editor ?? null;
					if (!editor) return;

					const cursor = editor.getCursor();
					const content = editor.getValue();
					editor.setValue(content);
					editor.setCursor(cursor);
				}
			});
		}, 100);
	}
}

// Modal 类可以在需要时添加
