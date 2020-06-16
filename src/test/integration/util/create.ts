import { WebDriver, Workbench, InputBox } from 'vscode-extension-tester';
import { DialogHandler } from 'vscode-extension-tester-native';
import { notificationExists } from './common';

/**
 * Wrapper around the project creation flow to make it slightly easier to test
 */
export class ProjectCreator {

	private driver: WebDriver;
	private workbench: Workbench;

	/**
	 * Creates a ProjectCreator
	 * @param {WebDriver} driver - Webdriver instance
	 * @param {Workbench} workbench - Workbench instance
	 */
	constructor(driver: WebDriver) {
		this.driver = driver;
		this.workbench = new Workbench();
	}

	public async createApp(options: AppCreateOptions): Promise<void> {
		await this.workbench.executeCommand('Titanium: Create Titanium application');

		await this.setName(options.name);
		await this.setId(options.id);
		await this.setPlatforms(options.platforms);
		await this.setEnableServices(options.enableServices);
		await this.setFolder(options.folder);

		await this.driver.wait(() => notificationExists('Creating application'), 1000);

		await this.driver.wait(async () => {
			// We need to sleep here as there are times when the 'Creating application' notification
			// is still shown but is dismissed by the time we get the text in notificationExists and
			// causes errors to be thrown that can't be handled
			await this.driver.sleep(500);
			return notificationExists('Project created');
		}, 25000);
	}

	public async createModule (options: ModuleCreateOptions): Promise<void> {
		await this.workbench.executeCommand('Titanium: Create Titanium module');

		await this.setName(options.name);
		await this.setId(options.id);
		await this.setPlatforms(options.platforms);
		await this.setFolder(options.folder);

		await this.driver.wait(() => notificationExists('Creating module'), 1000);

		await this.driver.wait(async () => {
			// We need to sleep here as there are times when the 'Creating module' notification
			// is still shown but is dismissed by the time we get the text in notificationExists and
			// causes errors to be thrown that can't be handled
			await this.driver.sleep(500);
			return notificationExists('Project created');
		}, 25000);
	}

	public async setEnableServices(enableServices: boolean): Promise<void> {
		const servicesText = enableServices ? 'Yes' : 'No';
		const input = await InputBox.create();
		await input.setText(servicesText);
		await input.confirm();
		await this.driver.sleep(100);
	}

	public async setFolder(folder: string): Promise<void> {
		const input = await InputBox.create();
		await input.confirm();
		const dialog = await DialogHandler.getOpenDialog();
		await dialog.selectPath(folder);
		await dialog.confirm();
	}

	public async setId(id: string): Promise<void> {
		const input = await InputBox.create();
		await input.setText(id);
		await input.confirm();
	}

	public async setName (name: string): Promise<void> {
		const input = await InputBox.create();
		await input.setText(name);
		await input.confirm();
	}

	public async setPlatforms(platforms: string[]): Promise<void> {
		const input = await InputBox.create();
		const choices = await input.getQuickPicks();
		for (const choice of choices) {
			const text = await choice.getText();
			if (!platforms.includes(text.toLowerCase())) {
				await input.selectQuickPick(text);
				await this.driver.sleep(50);
			}
		}
		await input.confirm();
	}
}