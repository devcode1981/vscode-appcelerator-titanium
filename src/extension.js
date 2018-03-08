const vscode = require('vscode');
const Appc = require('./appc');
const utils = require('./utils');
const related = require('./related');
const viewCompletionProvider = require('./providers/viewCompletionProvider');
const styleCompletionProvider = require('./providers/styleCompletionProvider');
const controllerCompletionProvider = require('./providers/controllerCompletionProvider');
const tiappCompletionProvider = require('./providers/tiappCompletionProvider');
const viewDefinitionProvider = require('./providers/viewDefinitionProvider');
const styleDefinitionProvider = require('./providers/styleDefinitionProvider');
const controllerDefinitionProvider = require('./providers/controllerDefinitionProvider');
const definitionProviderHelper = require('./providers/definitionProviderHelper');

let runOptions = {};

/**
 * Activate
 *
 * @param {Object} context 	extension context
 */
function activate(context) {

	definitionProviderHelper.activate(context.subscriptions);

	const viewFilePattern = '**/app/{views,widgets}/**/*.xml';
	const styleFilePattern = '**/*.tss';
	const controllerFilePattern = '{**/app/controllers/**/*.js,**/app/lib/**/*.js,**/app/widgets/**/*.js,**/app/alloy.js}';

	context.subscriptions.push(
		// register completion providers
		vscode.languages.registerCompletionItemProvider({ pattern: viewFilePattern }, viewCompletionProvider),
		vscode.languages.registerCompletionItemProvider({ pattern: styleFilePattern }, styleCompletionProvider),
		vscode.languages.registerCompletionItemProvider({ pattern: controllerFilePattern }, controllerCompletionProvider, '.'),
		vscode.languages.registerCompletionItemProvider({ pattern: '**/tiapp.xml' }, tiappCompletionProvider),

		// register hover providers
		vscode.languages.registerHoverProvider({ pattern: '**/{*.xml,*.tss,*.js}' }, definitionProviderHelper),

		// register definition providers
		vscode.languages.registerDefinitionProvider({ pattern: viewFilePattern }, viewDefinitionProvider),
		vscode.languages.registerDefinitionProvider({ pattern: styleFilePattern }, styleDefinitionProvider),
		vscode.languages.registerDefinitionProvider({ pattern: controllerFilePattern }, controllerDefinitionProvider),

		// register code action providers
		vscode.languages.registerCodeActionsProvider({ pattern: viewFilePattern }, viewDefinitionProvider),

		// register commands
		vscode.commands.registerCommand('appcelerator-titanium.init', () => {
			init();
		}),
		vscode.commands.registerCommand('appcelerator-titanium.run', () => {
			if (Appc.buildInProgress()) {
				vscode.window.showErrorMessage('Build in progress');
				return;
			}

			runOptions = {
				buildCommand: 'run'
			};

			selectPlatform()
				.then(platform => {
					if (platform) {
						runOptions.platform = platform;
						return selectTarget();
					}
				})
				.then(targetType => {
					if (!targetType) {
						return;
					}
					runOptions.targetType = targetType;
					if (runOptions.platform.id === 'ios') {
						if (targetType.id === 'simulator') {
							selectiOSSimulator()
								.then(target => {
									if (target) {
										runOptions.target = target;
										run(runOptions);
									}
								});
						} else if (targetType.id === 'device') {
							selectiOSDevice()
								.then(target => {
									if (target) {
										runOptions.target = target;
										return selectiOSCodeSigning();
									}
								})
								.then(profile => {
									if (profile) {
										runOptions.provisioningProfile = profile;
										run(runOptions);
									}
								});
						}
					} else if (runOptions.platform.id === 'android') {
						if (targetType.id === 'emulator') {
							selectAndroidEmulator()
								.then(target => {
									if (target) {
										runOptions.target = target;
										run(runOptions);
									}
								});
						} else if (targetType.id === 'device') {
							selectAndroidDevice()
								.then(target => {
									if (target) {
										runOptions.target = target;
										run(runOptions);
									}
								});
						}
					}
				});
		}),
		vscode.commands.registerCommand('appcelerator-titanium.dist', () => {
			if (Appc.buildInProgress()) {
				vscode.window.showErrorMessage('Build in progress');
				return;
			}

			runOptions = {
				buildCommand: 'dist-appstore'
			};

			selectPlatform()
				.then(platform => {
					if (platform) {
						runOptions.platform = platform;
						if (runOptions.platform.id === 'ios') {
							selectiOSDistribution()
								.then(target => {
									if (target) {
										runOptions.target = target;
										runOptions.buildCommand = target.id;
										return selectiOSCodeSigning();
									}
								})
								.then(profile => {
									if (profile) {
										runOptions.provisioningProfile = profile;
										run(runOptions);
									}
								});
						} else if (runOptions.platform.id === 'android') {

						}
					}
				});
		}),
		vscode.commands.registerCommand('appcelerator-titanium.stop', () => {
			Appc.stop();
		}),
		vscode.commands.registerCommand('appcelerator-titanium.open-related-view', () => {
			related.openRelatedFile('xml');
		}),
		vscode.commands.registerCommand('appcelerator-titanium.open-related-style', () => {
			related.openRelatedFile('tss');
		}),
		vscode.commands.registerCommand('appcelerator-titanium.open-related-controller', () => {
			related.openRelatedFile('js');
		}),
		vscode.commands.registerCommand('appcelerator-titanium.toggle-related-files', () => {
			related.openAllFiles();
		})
	);

	init();
}
exports.activate = activate;

/**
 * Deactivate
*/
function deactivate() {
}
exports.deactivate = deactivate;

/**
 * Initialise extension - fetch appc info
*/
function init() {
	vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Fetching Appcelerator envionment...' }, p => {
		return new Promise((resolve, reject) => {
			Appc.getInfo((info) => {
				if (info) {
					p.report({ message: 'Fetching Appcelerator envionment... Done' });
					setTimeout(resolve, 1000);
				} else {
					vscode.window.showErrorMessage('Error fetching Appcelerator environment');
					setTimeout(reject, 1000);
				}
			});
		});
	});
}

/**
 * Select platform
 *
 * @returns {Thenable}
*/
function selectPlatform() {
	return vscode.window.showQuickPick([ {
		label: 'iOS',
		id: 'ios'
	},
	{
		label: 'Android',
		id: 'android'
	} ]);
}

/**
 * Select target: simulator/emulator or device
 *
 * @returns {Thenable}
*/
function selectTarget() {
	return vscode.window.showQuickPick([ {
		label: (runOptions.platform.id === 'android') ? 'Emulator' : 'Simulator',
		id: (runOptions.platform.id === 'android') ? 'emulator' : 'simulator'
	},
	{
		label: 'Device',
		id: 'device'
	} ]);
}

/**
 * Select iOS simulator
 *
 * @returns {Thenable}
*/
function selectiOSSimulator() {
	return vscode.window.showQuickPick(Object.keys(Appc.iOSSimulators())).then(version => {
		const simulators = Appc.iOSSimulators()[version].map(simulator => {
			return {
				udid: simulator.udid,
				label: `${simulator.name} (${version})`,
				version: version
			};
		});
		return vscode.window.showQuickPick(simulators);
	});
}

/**
 * Select iOS device
 *
 * @returns {Thenable}
*/
function selectiOSDevice() {
	const devices = Appc.iOSDevices().map(device => {
		return {
			udid: device.udid,
			label: device.name
		};
	});
	return vscode.window.showQuickPick(devices);
}

/**
 * Select iOS code signing: certificate and provisioning profile
 *
 * @returns {Thenable}
*/
function selectiOSCodeSigning() {
	return selectiOSCertificate()
		.then(selectedCertificate => {
			if (!selectedCertificate) {
				return;
			}

			const certificate = Appc.iOSCertificates(runOptions.buildCommand === 'run' ? 'developer' : 'distribution').find(cert => cert.name === selectedCertificate.label);
			runOptions.certificate = certificate;
			return selectiOSProvisioningProfile();
		});
}

/**
 * Select iOS certificate
 *
 * @returns {Thenable}
 */
function selectiOSCertificate() {
	const certificates = Appc.iOSCertificates(runOptions.buildCommand === 'run' ? 'developer' : 'distribution').map(certificate => {
		return {
			label: certificate.name
		};
	});
	return vscode.window.showQuickPick(certificates);
}

/**
 * Select iOS provisioning profile
 *
 * @returns {Thenable}
*/
function selectiOSProvisioningProfile() {
	const profiles = [];
	let deployment = 'development';
	if (runOptions.buildCommand === 'dist-adhoc') {
		deployment = 'distribution';
	} else if (runOptions.buildCommand === 'dist-appstore') {
		deployment = 'appstore';
	}
	Appc.iOSProvisioningProfiles(deployment, runOptions.certificate).forEach(profile => {
		if (!profile.disabled) {
			profiles.push({
				label: profile.name,
				uuid: profile.uuid
			});
		}
	});
	return vscode.window.showQuickPick(profiles);
}

/**
 * Select Android emulator
 *
 * @returns {Thenable}
*/
function selectAndroidEmulator() {
	const emulators = Appc.androidEmulators();
	let options = [];
	if (emulators.AVDs.length > 0) {
		emulators.AVDs.forEach(emulator => {
			options.push({
				udid: emulator.id,
				label: emulator.name
			});
		});
	}
	if (emulators.Genymotion.length > 0) {
		emulators.Genymotion.forEach(emulator => {
			options.push({
				udid: emulator.id,
				label: emulator.name
			});
		});
	}
	return vscode.window.showQuickPick(options);
}

/**
 * Select Android device
 *
 * @returns {Thenable}
*/
function selectAndroidDevice() {
	const devices = Appc.androidDevices().map(device => {
		return {
			udid: device.udid,
			label: device.name
		};
	});
	return vscode.window.showQuickPick(devices);
}

/**
 * Select iOS distribution
 *
 * @returns {Thenable}
*/
function selectiOSDistribution() {
	return vscode.window.showQuickPick([ {
		label: 'App Store',
		id: 'dist-appstore'
	},
	{
		label: 'Ad-Hoc',
		id: 'dist-adhoc'
	} ]);
}

/**
 * Run
 *
 * @param {Object} opts 	run options
 */
function run(opts) {
	// console.log(JSON.stringify(opts, null, 4));

	let args = [ '-p', opts.platform.id, '--project-dir', vscode.workspace.rootPath ];

	if (opts.buildCommand === 'run') {
		args = args.concat([ '--target', opts.targetType.id, '--device-id', opts.target.udid ]);

		if (opts.targetType.id === 'device' && opts.platform.id === 'ios') {
			args = args.concat([
				'--developer-name', opts.certificate.name,
				'--pp-uuid', opts.provisioningProfile.uuid
			]);
		}
	} else if (opts.buildCommand) {
		args = args.concat([ '--target', opts.buildCommand, '--output-dir', utils.distributionOutputDirectory() ]);
		if (opts.platform.id === 'ios') {
			args = args.concat([
				'--distribution-name', opts.certificate.name,
				'--pp-uuid', opts.provisioningProfile.uuid
			]);
		}
	}

	// console.log(JSON.stringify(args, null, 4));

	return;

	if (opts.platform && opts.target) {
		vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: `Building for ${opts.platform.label} ${opts.target.label}...` }, p => {
			return new Promise((resolve) => {
				Appc.run({
					args,
					error: () => {
						resolve();
					},
					exit: () => {
						resolve();
					}
				});
			});
		});
	}
}