import {App, PluginSettingTab, Setting, Workspace} from "obsidian";
import DecoratorPlugin from "./main";

export interface DecoratorPluginSettings {
	displayTaskNumber: number;
	enableTaskFade: boolean;
	metadataProperty: string;
	metadataValue: string | boolean;
}

export const DEFAULT_SETTINGS: DecoratorPluginSettings = {
	displayTaskNumber: 3,
	enableTaskFade: true,
	metadataProperty: 'show-all-tasks',
	metadataValue: true
}

export class DecorationSettingTab extends PluginSettingTab {
	plugin: DecoratorPlugin;

	constructor(app: App, plugin: DecoratorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.app = app;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Show all tasks in specific notes')
			.setDesc('When enabled, tasks beyond the display limit will be faded. You can disable this for specific notes using file metadata.')
			.addToggle(toggle => toggle
				.setValue(!this.plugin.settings.enableTaskFade)
				.onChange(async (value) => {
					// 反转逻辑：开关 ON 表示显示所有任务（不模糊）
					this.plugin.settings.enableTaskFade = !value;
					await this.plugin.saveSettings();

					// 重新加载装饰器扩展以应用新设置
					this.plugin.reloadTaskMarkerExtension();
				}));

		new Setting(containerEl)
			.setName('Display task number')
			.setDesc('How many tasks to display')
			.addText(text => text
				.setPlaceholder('Enter the number')
				.setValue(this.plugin.settings.displayTaskNumber.toString())
				.onChange(async (value) => {
					const newValue = parseInt(value);
					if (!isNaN(newValue) && newValue > 0) {
						this.plugin.settings.displayTaskNumber = newValue;
						await this.plugin.saveSettings();

						// 重新加载装饰器扩展以应用新设置
						this.plugin.reloadTaskMarkerExtension();
					}
				}));

		new Setting(containerEl)
			.setName('Property to always show all tasks')
			.setHeading();

		new Setting(containerEl)
			.setName('Property name')
			.setDesc('If you have notes that should always show all tasks (without fade), add the corresponding property name. Use "tags" when setting to tags.')
			.addText(text => text
				.setPlaceholder('show-all-tasks')
				.setValue(this.plugin.settings.metadataProperty)
				.onChange(async (value) => {
					this.plugin.settings.metadataProperty = value || 'show-all-tasks';
					await this.plugin.saveSettings();

					// 重新加载装饰器扩展以应用新设置
					this.plugin.reloadTaskMarkerExtension();
				}));

		new Setting(containerEl)
			.setName('Property value')
			.setDesc('The value that triggers showing all tasks. For boolean properties use "true" or "false". For tags, enter the tag name.')
			.addText(text => text
				.setPlaceholder('true')
				.setValue(String(this.plugin.settings.metadataValue))
				.onChange(async (value) => {
					// Convert input to appropriate type
					if (value === 'true' || value === 'false') {
						// Convert string to boolean
						this.plugin.settings.metadataValue = value === 'true';
					} else {
						this.plugin.settings.metadataValue = value || 'true';
					}
					await this.plugin.saveSettings();

					// 重新加载装饰器扩展以应用新设置
					this.plugin.reloadTaskMarkerExtension();
				}));

	}
}
