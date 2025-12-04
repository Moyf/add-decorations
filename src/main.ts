import { MarkdownView, Plugin, setIcon } from 'obsidian';
import { DEFAULT_SETTINGS, DecoratorPluginSettings, DecorationSettingTab } from './settings';
import { createTaskMarkerPlugin } from './plugins/taskMarkerPlugin';

export default class DecoratorPlugin extends Plugin {
	settings: DecoratorPluginSettings;
	private taskMarkerExtension: ReturnType<typeof createTaskMarkerPlugin> | null = null;
	// 创建一个共享的设置对象，用于在扩展中引用
	public sharedSettings: { current: DecoratorPluginSettings } = { current: {} as DecoratorPluginSettings };
	// 状态栏项
	private statusBarItem: HTMLElement | null = null;

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

		// 添加状态栏按钮来切换任务模糊效果
		this.statusBarItem = this.addStatusBarItem();
		this.updateStatusBarItem();

		// 添加点击事件
		this.statusBarItem.addEventListener('click', (evt: MouseEvent) => {
			evt.preventDefault();
			// 切换 enableTaskFade 设置
			void (async () => {
				this.settings.enableTaskFade = !this.settings.enableTaskFade;
				await this.saveSettings();
				// 更新状态栏按钮状态
				this.updateStatusBarItem();
				// 重新加载装饰器扩展
				this.reloadTaskMarkerExtension();
			})();
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new DecorationSettingTab(this.app, this));

		// Add command to toggle task fade effect
		this.addCommand({
			id: 'toggle-task-fade',
			name: 'Toggle show all tasks',
			callback: async () => {
				this.settings.enableTaskFade = !this.settings.enableTaskFade;
				await this.saveSettings();
				this.updateStatusBarItem();
				this.reloadTaskMarkerExtension();
			}
		});

		// Listen for metadata changes to update decorations when frontmatter changes
		this.registerEvent(
			this.app.metadataCache.on('changed', (file) => {
				const cache = this.app.metadataCache.getFileCache(file);
				const frontmatter = cache?.frontmatter;

				// Check if the changed file has the property we're monitoring
				if (frontmatter && this.settings.metadataProperty in frontmatter) {
					// Trigger a refresh of the task marker extension
					this.reloadTaskMarkerExtension();
				}
			})
		);

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
		// 更新状态栏按钮以反映设置更改
		this.updateStatusBarItem();
	}

	loadTaskMarkerExtension() {
		// 初始化共享设置
		this.sharedSettings.current = this.settings;
		// 创建扩展，传递共享设置引用和 app
		this.taskMarkerExtension = createTaskMarkerPlugin(this.sharedSettings, this.app);
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

	updateStatusBarItem() {
		if (!this.statusBarItem) return;

		// 清空状态栏项
		this.statusBarItem.empty();

		// 添加 mod-clickable 类，使状态栏项可点击并正确显示 tooltip
		this.statusBarItem.addClass('mod-clickable');

		// 根据当前设置状态设置图标
		const iconEl = this.statusBarItem.createSpan();
		iconEl.addClass('status-bar-item-icon');

		// 设置 tooltip 显示在上方
		this.statusBarItem.setAttribute('data-tooltip-position', 'top');

		// 使用 Obsidian 内置的 Lucide 图标
		// eye-off 表示任务被模糊，eye 表示显示所有任务
		if (this.settings.enableTaskFade) {
			setIcon(iconEl, 'eye-off');
			this.statusBarItem.setAttribute('aria-label', 'Tasks are being faded beyond limit. Click to show all tasks');
		} else {
			setIcon(iconEl, 'eye');
			this.statusBarItem.setAttribute('aria-label', 'Showing all tasks. Click to fade tasks beyond limit');
		}
	}
}

// Modal 类可以在需要时添加
