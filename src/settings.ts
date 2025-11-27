import {App, PluginSettingTab, Setting, Workspace} from "obsidian";
import DecoratorPlugin from "./main";

export interface DecoratorPluginSettings {
	displayTaskNumber: number;
}

export const DEFAULT_SETTINGS: DecoratorPluginSettings = {
	displayTaskNumber: 3
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
	}
}
