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
			.setName('Enable task fade effect')
			.setDesc('When enabled, tasks beyond the display limit will be faded')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableTaskFade)
				.onChange(async (value) => {
					this.plugin.settings.enableTaskFade = value;
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
			.setName('Metadata property name')
			.setDesc('File metadata property that controls task fading (e.g., show-all-tasks)')
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
			.setName('Metadata property value')
			.setDesc('Value that disables task fading (can be true/false or any text)')
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
