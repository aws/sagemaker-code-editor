/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/userDataProfilesEditor';
import { $, addDisposableListener, append, Dimension, EventHelper, EventType, IDomPosition, trackFocus } from 'vs/base/browser/dom';
import { Action, IAction, Separator, SubmenuAction } from 'vs/base/common/actions';
import { Event } from 'vs/base/common/event';
import { ThemeIcon } from 'vs/base/common/themables';
import { localize } from 'vs/nls';
import { IContextMenuService, IContextViewService } from 'vs/platform/contextview/browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IUserDataProfile, IUserDataProfilesService, ProfileResourceType } from 'vs/platform/userDataProfile/common/userDataProfile';
import { EditorPane } from 'vs/workbench/browser/parts/editor/editorPane';
import { IEditorOpenContext, IEditorSerializer, IUntypedEditorInput } from 'vs/workbench/common/editor';
import { EditorInput } from 'vs/workbench/common/editor/editorInput';
import { IUserDataProfilesEditor } from 'vs/workbench/contrib/userDataProfile/common/userDataProfile';
import { IEditorGroup } from 'vs/workbench/services/editor/common/editorGroupsService';
import { defaultUserDataProfileIcon, IProfileResourceChildTreeItem, IProfileTemplateInfo, IUserDataProfileManagementService, PROFILE_FILTER } from 'vs/workbench/services/userDataProfile/common/userDataProfile';
import { Orientation, Sizing, SplitView } from 'vs/base/browser/ui/splitview/splitview';
import { Button, ButtonWithDropdown } from 'vs/base/browser/ui/button/button';
import { defaultButtonStyles, defaultCheckboxStyles, defaultInputBoxStyles, defaultSelectBoxStyles } from 'vs/platform/theme/browser/defaultStyles';
import { registerColor } from 'vs/platform/theme/common/colorRegistry';
import { PANEL_BORDER } from 'vs/workbench/common/theme';
import { WorkbenchAsyncDataTree, WorkbenchObjectTree } from 'vs/platform/list/browser/listService';
import { IListVirtualDelegate } from 'vs/base/browser/ui/list/list';
import { IAsyncDataSource, IObjectTreeElement, ITreeNode, ITreeRenderer, ObjectTreeElementCollapseState } from 'vs/base/browser/ui/tree/tree';
import { CancellationToken } from 'vs/base/common/cancellation';
import { IEditorOptions } from 'vs/platform/editor/common/editor';
import { Disposable, DisposableStore, IDisposable, MutableDisposable } from 'vs/base/common/lifecycle';
import { InputBox, MessageType } from 'vs/base/browser/ui/inputbox/inputBox';
import { Checkbox } from 'vs/base/browser/ui/toggle/toggle';
import { DEFAULT_ICON, ICONS } from 'vs/workbench/services/userDataProfile/common/userDataProfileIcons';
import { WorkbenchIconSelectBox } from 'vs/workbench/services/userDataProfile/browser/iconSelectBox';
import { StandardKeyboardEvent } from 'vs/base/browser/keyboardEvent';
import { KeyCode } from 'vs/base/common/keyCodes';
import { IHoverService, WorkbenchHoverDelegate } from 'vs/platform/hover/browser/hover';
import { HoverPosition } from 'vs/base/browser/ui/hover/hoverWidget';
import { IHoverWidget } from 'vs/base/browser/ui/hover/hover';
import { ISelectOptionItem, SelectBox } from 'vs/base/browser/ui/selectBox/selectBox';
import { URI } from 'vs/base/common/uri';
import { IEditorProgressService } from 'vs/platform/progress/common/progress';
import { ExtensionsResourceTreeItem } from 'vs/workbench/services/userDataProfile/browser/extensionsResource';
import { isString, isUndefined } from 'vs/base/common/types';
import { basename } from 'vs/base/common/resources';
import { RenderIndentGuides } from 'vs/base/browser/ui/tree/abstractTree';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { API_OPEN_EDITOR_COMMAND_ID } from 'vs/workbench/browser/parts/editor/editorCommands';
import { SIDE_GROUP } from 'vs/workbench/services/editor/common/editorService';
import { DEFAULT_LABELS_CONTAINER, IResourceLabel, ResourceLabels } from 'vs/workbench/browser/labels';
import { IHoverDelegate } from 'vs/base/browser/ui/hover/hoverDelegate';
import { IDialogService, IFileDialogService } from 'vs/platform/dialogs/common/dialogs';
import { IQuickInputService, IQuickPickItem } from 'vs/platform/quickinput/common/quickInput';
import { AbstractUserDataProfileElement, IProfileElement, NewProfileElement, UserDataProfileElement, UserDataProfilesEditorModel } from 'vs/workbench/contrib/userDataProfile/browser/userDataProfilesEditorModel';
import { Codicon } from 'vs/base/common/codicons';
import { WorkbenchToolBar } from 'vs/platform/actions/browser/toolbar';
import { createInstantHoverDelegate } from 'vs/base/browser/ui/hover/hoverDelegateFactory';

export const profilesSashBorder = registerColor('profiles.sashBorder', { dark: PANEL_BORDER, light: PANEL_BORDER, hcDark: PANEL_BORDER, hcLight: PANEL_BORDER }, localize('profilesSashBorder', "The color of the Profiles editor splitview sash border."));

export class UserDataProfilesEditor extends EditorPane implements IUserDataProfilesEditor {

	static readonly ID: string = 'workbench.editor.userDataProfiles';

	private container: HTMLElement | undefined;
	private splitView: SplitView<number> | undefined;
	private profilesTree: WorkbenchObjectTree<IProfileElement> | undefined;
	private profileWidget: ProfileWidget | undefined;

	private model: UserDataProfilesEditorModel | undefined;
	private templates: IProfileTemplateInfo[] = [];

	constructor(
		group: IEditorGroup,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IUserDataProfileManagementService private readonly userDataProfileManagementService: IUserDataProfileManagementService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IDialogService private readonly dialogService: IDialogService,
		@IFileDialogService private readonly fileDialogService: IFileDialogService,
		@IContextMenuService private readonly contextMenuService: IContextMenuService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super(UserDataProfilesEditor.ID, group, telemetryService, themeService, storageService);
	}

	layout(dimension: Dimension, position?: IDomPosition | undefined): void {
		if (this.container && this.splitView) {
			const height = dimension.height - 20;
			this.splitView.layout(this.container?.clientWidth, height);
			this.splitView.el.style.height = `${height}px`;
		}
	}

	protected createEditor(parent: HTMLElement): void {
		this.container = append(parent, $('.profiles-editor'));

		const sidebarView = append(this.container, $('.sidebar-view'));
		const sidebarContainer = append(sidebarView, $('.sidebar-container'));

		const contentsView = append(this.container, $('.contents-view'));
		const contentsContainer = append(contentsView, $('.contents-container'));
		this.profileWidget = this._register(this.instantiationService.createInstance(ProfileWidget, contentsContainer));

		this.splitView = new SplitView(this.container, {
			orientation: Orientation.HORIZONTAL,
			proportionalLayout: true
		});

		this.renderSidebar(sidebarContainer);
		this.splitView.addView({
			onDidChange: Event.None,
			element: sidebarView,
			minimumSize: 175,
			maximumSize: 350,
			layout: (width, _, height) => {
				sidebarView.style.width = `${width}px`;
				if (height && this.profilesTree) {
					this.profilesTree.getHTMLElement().style.height = `${height - 38}px`;
					this.profilesTree.layout(height - 38, width);
				}
			}
		}, 300, undefined, true);
		this.splitView.addView({
			onDidChange: Event.None,
			element: contentsView,
			minimumSize: 500,
			maximumSize: Number.POSITIVE_INFINITY,
			layout: (width, _, height) => {
				contentsView.style.width = `${width}px`;
				if (height) {
					this.profileWidget?.layout(new Dimension(width, height));
				}
			}
		}, Sizing.Distribute, undefined, true);

		const borderColor = this.theme.getColor(profilesSashBorder)!;
		this.splitView.style({ separatorBorder: borderColor });

		this.registerListeners();

		this.userDataProfileManagementService.getBuiltinProfileTemplates().then(templates => {
			this.templates = templates;
			this.profileWidget!.templates = templates;
		});
	}

	private renderSidebar(parent: HTMLElement): void {
		// render New Profile Button
		this.renderNewProfileButton(append(parent, $('.new-profile-button')));

		// render profiles and templates tree
		const renderer = this.instantiationService.createInstance(ProfileTreeElementRenderer);
		const delegate = new ProfileTreeElementDelegate();
		this.profilesTree = this._register(this.instantiationService.createInstance(WorkbenchObjectTree<IProfileElement>, 'ProfilesTree',
			append(parent, $('.profiles-tree')),
			delegate,
			[renderer],
			{
				multipleSelectionSupport: false,
				setRowLineHeight: false,
				horizontalScrolling: false,
				accessibilityProvider: {
					getAriaLabel(extensionFeature: IProfileElement | null): string {
						return extensionFeature?.name ?? '';
					},
					getWidgetAriaLabel(): string {
						return localize('profiles', "Profiles");
					}
				},
				openOnSingleClick: true,
				enableStickyScroll: false,
				identityProvider: {
					getId(e) {
						if (e instanceof UserDataProfileElement) {
							return e.profile.id;
						}
						return e.name;
					}
				}
			}));
	}

	private renderNewProfileButton(parent: HTMLElement): void {
		const button = this._register(new ButtonWithDropdown(parent, {
			actions: {
				getActions: () => {
					const actions: IAction[] = [];
					if (this.templates.length) {
						actions.push(new SubmenuAction('from.template', localize('from template', "From Template"),
							this.templates.map(template => new Action(`template:${template.url}`, template.name, undefined, true, async () => {
								this.createNewProfile(URI.parse(template.url));
							}))));
						actions.push(new Separator());
					}
					actions.push(new Action('importProfile', localize('importProfile', "Import Profile..."), undefined, true, () => this.importProfile()));
					return actions;
				}
			},
			addPrimaryActionToDropdown: false,
			contextMenuProvider: this.contextMenuService,
			supportIcons: true,
			...defaultButtonStyles
		}));
		button.label = `$(add) ${localize('newProfile', "New Profile")}`;
		this._register(button.onDidClick(e => this.createNewProfile()));
	}

	private registerListeners(): void {
		if (this.profilesTree) {
			this._register(this.profilesTree.onDidChangeSelection(e => {
				const [element] = e.elements;
				if (element instanceof AbstractUserDataProfileElement) {
					this.profileWidget?.render(element);
				}
			}));

			this._register(this.profilesTree.onContextMenu(e => {
				if (e.element instanceof AbstractUserDataProfileElement) {
					this.contextMenuService.showContextMenu({
						getAnchor: () => e.anchor,
						getActions: () => e.element instanceof AbstractUserDataProfileElement ? e.element.contextMenuActions.slice(0) : [],
						getActionsContext: () => e.element
					});
				}
			}));
		}
	}

	private async importProfile(): Promise<void> {
		const disposables = new DisposableStore();
		const quickPick = disposables.add(this.quickInputService.createQuickPick());

		const updateQuickPickItems = (value?: string) => {
			const quickPickItems: IQuickPickItem[] = [];
			if (value) {
				quickPickItems.push({ label: quickPick.value, description: localize('import from url', "Import from URL") });
			}
			quickPickItems.push({ label: localize('import from file', "Select File...") });
			quickPick.items = quickPickItems;
		};

		quickPick.title = localize('import profile quick pick title', "Import from Profile Template...");
		quickPick.placeholder = localize('import profile placeholder', "Provide Profile Template URL");
		quickPick.ignoreFocusOut = true;
		disposables.add(quickPick.onDidChangeValue(updateQuickPickItems));
		updateQuickPickItems();
		quickPick.matchOnLabel = false;
		quickPick.matchOnDescription = false;
		disposables.add(quickPick.onDidAccept(async () => {
			quickPick.hide();
			const selectedItem = quickPick.selectedItems[0];
			if (!selectedItem) {
				return;
			}
			const url = selectedItem.label === quickPick.value ? URI.parse(quickPick.value) : await this.getProfileUriFromFileSystem();
			if (url) {
				this.createNewProfile(url);
			}
		}));
		disposables.add(quickPick.onDidHide(() => disposables.dispose()));
		quickPick.show();
	}

	private async createNewProfile(copyFrom?: URI | IUserDataProfile): Promise<void> {
		if (this.model?.profiles.some(p => p instanceof NewProfileElement)) {
			const result = await this.dialogService.confirm({
				type: 'info',
				message: localize('new profile exists', "A new profile is already being created. Do you want to discard it and create a new one?"),
				primaryButton: localize('discard', "Discard & Create"),
				cancelButton: localize('cancel', "Cancel")
			});
			if (!result.confirmed) {
				return;
			}
			this.model.revert();
		}
		this.model?.createNewProfile(copyFrom);
	}

	private async getProfileUriFromFileSystem(): Promise<URI | null> {
		const profileLocation = await this.fileDialogService.showOpenDialog({
			canSelectFolders: false,
			canSelectFiles: true,
			canSelectMany: false,
			filters: PROFILE_FILTER,
			title: localize('import profile dialog', "Select Profile Template File"),
		});
		if (!profileLocation) {
			return null;
		}
		return profileLocation[0];
	}

	override async setInput(input: UserDataProfilesEditorInput, options: IEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);
		this.model = await input.resolve();
		this.updateProfilesTree();
		this._register(this.model.onDidChange((element) => {
			this.updateProfilesTree(element);
		}));
	}

	override focus(): void {
		super.focus();
		this.profilesTree?.domFocus();
	}

	private updateProfilesTree(elementToSelect?: IProfileElement): void {
		if (!this.model) {
			return;
		}
		const profileElements: IObjectTreeElement<IProfileElement>[] = this.model.profiles.map(element => ({ element }));
		const currentSelection = this.profilesTree?.getSelection()?.[0];
		this.profilesTree?.setChildren(null, [
			{
				element: { name: localize('profiles', "Profiles") },
				children: profileElements,
				collapsible: false,
				collapsed: ObjectTreeElementCollapseState.Expanded
			}
		]);
		if (elementToSelect) {
			this.profilesTree?.setSelection([elementToSelect]);
		} else if (currentSelection) {
			if (currentSelection instanceof AbstractUserDataProfileElement) {
				if (!this.model.profiles.includes(currentSelection)) {
					const elementToSelect = this.model.profiles.find(profile => profile.name === currentSelection.name) ?? this.model.profiles[0];
					if (elementToSelect) {
						this.profilesTree?.setSelection([elementToSelect]);
					}
				}
			}
		} else {
			const elementToSelect = this.model.profiles.find(profile => profile.active) ?? this.model.profiles[0];
			if (elementToSelect) {
				this.profilesTree?.setSelection([elementToSelect]);
			}
		}
	}

}

interface IProfileTreeElementTemplateData {
	readonly icon: HTMLElement;
	readonly label: HTMLElement;
	readonly description: HTMLElement;
	readonly disposables: DisposableStore;
}

class ProfileTreeElementDelegate implements IListVirtualDelegate<IProfileElement> {
	getHeight(element: IProfileElement) {
		return 30;
	}
	getTemplateId() { return 'profileTreeElement'; }
}

class ProfileTreeElementRenderer implements ITreeRenderer<IProfileElement, void, IProfileTreeElementTemplateData> {

	readonly templateId = 'profileTreeElement';

	renderTemplate(container: HTMLElement): IProfileTreeElementTemplateData {
		container.classList.add('profile-tree-item');
		const icon = append(container, $('.profile-tree-item-icon'));
		const label = append(container, $('.profile-tree-item-label'));
		const description = append(container, $('.profile-tree-item-description'));
		append(description, $(`span${ThemeIcon.asCSSSelector(Codicon.check)}`));
		append(description, $('span', undefined, localize('activeProfile', "Active")));
		return { label, icon, description, disposables: new DisposableStore() };
	}

	renderElement({ element }: ITreeNode<IProfileElement, void>, index: number, templateData: IProfileTreeElementTemplateData, height: number | undefined): void {
		templateData.disposables.clear();
		templateData.label.textContent = element.name;
		if (element.icon) {
			templateData.icon.className = ThemeIcon.asClassName(ThemeIcon.fromId(element.icon));
		} else {
			templateData.icon.className = 'hide';
		}
		templateData.description.classList.toggle('hide', !element.active);
		if (element.onDidChange) {
			templateData.disposables.add(element.onDidChange(e => {
				if (e.name) {
					templateData.label.textContent = element.name;
				}
				if (e.icon) {
					if (element.icon) {
						templateData.icon.className = ThemeIcon.asClassName(ThemeIcon.fromId(element.icon));
					} else {
						templateData.icon.className = 'hide';
					}
				}
				if (e.active) {
					templateData.description.classList.toggle('hide', !element.active);
				}
			}));
		}
	}

	disposeTemplate(templateData: IProfileTreeElementTemplateData): void {
		templateData.disposables.dispose();
	}
}

class ProfileWidget extends Disposable {

	private readonly profileTitle: HTMLElement;
	private readonly toolbar: WorkbenchToolBar;
	private readonly buttonContainer: HTMLElement;
	private readonly iconElement: HTMLElement;
	private readonly nameContainer: HTMLElement;
	private readonly nameInput: InputBox;
	private readonly copyFromContainer: HTMLElement;
	private readonly copyFromSelectBox: SelectBox;
	private copyFromOptions: (ISelectOptionItem & { id?: string; source?: IUserDataProfile | URI })[] = [];

	private readonly resourcesTree: WorkbenchAsyncDataTree<AbstractUserDataProfileElement, ProfileResourceTreeElement>;

	private _templates: IProfileTemplateInfo[] = [];
	public set templates(templates: IProfileTemplateInfo[]) {
		this._templates = templates;
		this.renderSelectBox();
	}

	private readonly _profileElement = this._register(new MutableDisposable<{ element: AbstractUserDataProfileElement } & IDisposable>());

	constructor(
		parent: HTMLElement,
		@IHoverService private readonly hoverService: IHoverService,
		@IUserDataProfilesService private readonly userDataProfilesService: IUserDataProfilesService,
		@IContextViewService private readonly contextViewService: IContextViewService,
		@IEditorProgressService private readonly editorProgressService: IEditorProgressService,
		@ICommandService private readonly commandService: ICommandService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super();

		const header = append(parent, $('.profile-header'));
		const title = append(header, $('.profile-title'));
		append(title, $('span', undefined, localize('profile', "Profile: ")));
		this.profileTitle = append(title, $('span'));
		const actionsContainer = append(header, $('.profile-actions-container'));
		this.buttonContainer = append(actionsContainer, $('.profile-button-container'));
		this.toolbar = this._register(instantiationService.createInstance(WorkbenchToolBar,
			actionsContainer,
			{
				hoverDelegate: this._register(createInstantHoverDelegate()),
			}
		));

		const body = append(parent, $('.profile-body'));

		this.nameContainer = append(body, $('.profile-name-container'));
		this.iconElement = append(this.nameContainer, $(`${ThemeIcon.asCSSSelector(DEFAULT_ICON)}`, { 'tabindex': '0', 'role': 'button', 'aria-label': localize('icon', "Profile Icon") }));
		this.renderIconSelectBox(this.iconElement);

		this.nameInput = this._register(new InputBox(
			this.nameContainer,
			undefined,
			{
				inputBoxStyles: defaultInputBoxStyles,
				ariaLabel: localize('profileName', "Profile Name"),
				placeholder: localize('profileName', "Profile Name"),
				validationOptions: {
					validation: (value) => {
						if (!value) {
							return {
								content: localize('name required', "Profile name is required and must be a non-empty value."),
								type: MessageType.ERROR
							};
						}
						const initialName = this._profileElement.value?.element instanceof UserDataProfileElement ? this._profileElement.value.element.profile.name : undefined;
						if (initialName !== value && this.userDataProfilesService.profiles.some(p => p.name === value)) {
							return {
								content: localize('profileExists', "Profile with name {0} already exists.", value),
								type: MessageType.ERROR
							};
						}
						return null;
					}
				}
			}
		));
		this.nameInput.onDidChange(value => {
			if (this._profileElement.value && value) {
				this._profileElement.value.element.name = value;
			}
		});
		const focusTracker = this._register(trackFocus(this.nameInput.inputElement));
		this._register(focusTracker.onDidBlur(() => {
			if (this._profileElement.value && !this.nameInput.value) {
				this.nameInput.value = this._profileElement.value.element.name;
			}
		}));

		this.copyFromContainer = append(body, $('.profile-copy-from-container'));
		append(this.copyFromContainer, $('.profile-copy-from-label', undefined, localize('create from', "Copy from:")));
		this.copyFromSelectBox = this._register(this.instantiationService.createInstance(SelectBox,
			[],
			0,
			this.contextViewService,
			defaultSelectBoxStyles,
			{
				useCustomDrawn: true,
				ariaLabel: localize('copy profile from', "Copy profile from"),
			}
		));
		this.copyFromSelectBox.render(append(this.copyFromContainer, $('.profile-select-container')));

		const contentsContainer = append(body, $('.profile-contents-container'));
		append(contentsContainer, $('.profile-contents-label', undefined, localize('contents', "Contents")));

		const delegate = new ProfileResourceTreeElementDelegate();
		this.resourcesTree = this._register(this.instantiationService.createInstance(WorkbenchAsyncDataTree<AbstractUserDataProfileElement, ProfileResourceTreeElement>,
			'ProfileEditor-ResourcesTree',
			append(body, $('.profile-content-tree.file-icon-themable-tree.show-file-icons')),
			delegate,
			[
				this.instantiationService.createInstance(ExistingProfileResourceTreeRenderer),
				this.instantiationService.createInstance(NewProfileResourceTreeRenderer),
				this.instantiationService.createInstance(ProfileResourceChildTreeItemRenderer),
			],
			this.instantiationService.createInstance(ProfileResourceTreeDataSource),
			{
				multipleSelectionSupport: false,
				horizontalScrolling: false,
				accessibilityProvider: {
					getAriaLabel(element: ProfileResourceTreeElement | null): string {
						if (isString(element?.element)) {
							return element.element;
						}
						if (element?.element) {
							return element.element.label?.label ?? '';
						}
						return '';
					},
					getWidgetAriaLabel(): string {
						return '';
					},
				},
				identityProvider: {
					getId(element) {
						if (isString(element?.element)) {
							return element.element;
						}
						if (element?.element) {
							return element.element.handle;
						}
						return '';
					}
				},
				expandOnlyOnTwistieClick: true,
				renderIndentGuides: RenderIndentGuides.None,
				openOnSingleClick: true,
				enableStickyScroll: false,
			}));
		this._register(this.resourcesTree.onDidOpen(async (e) => {
			if (!e.browserEvent) {
				return;
			}
			if (e.browserEvent.target && (e.browserEvent.target as HTMLElement).classList.contains(Checkbox.CLASS_NAME)) {
				return;
			}
			if (e.element && !isString(e.element.element)) {
				if (e.element.element.resourceUri) {
					await this.commandService.executeCommand(API_OPEN_EDITOR_COMMAND_ID, e.element.element.resourceUri, [SIDE_GROUP], undefined, e);
				} else if (e.element.element.parent instanceof ExtensionsResourceTreeItem) {
					await this.commandService.executeCommand('extension.open', e.element.element.handle, undefined, true, undefined, true);
				}
			}
		}));
	}

	private renderIconSelectBox(iconContainer: HTMLElement): void {
		const iconSelectBox = this._register(this.instantiationService.createInstance(WorkbenchIconSelectBox, { icons: ICONS, inputBoxStyles: defaultInputBoxStyles }));
		let hoverWidget: IHoverWidget | undefined;
		const showIconSelectBox = () => {
			if (this._profileElement.value?.element instanceof UserDataProfileElement && this._profileElement.value.element.profile.isDefault) {
				return;
			}
			iconSelectBox.clearInput();
			hoverWidget = this.hoverService.showHover({
				content: iconSelectBox.domNode,
				target: iconContainer,
				position: {
					hoverPosition: HoverPosition.BELOW,
				},
				persistence: {
					sticky: true,
				},
				appearance: {
					showPointer: true,
				},
			}, true);

			if (hoverWidget) {
				iconSelectBox.layout(new Dimension(486, 260));
				iconSelectBox.focus();
			}
		};
		this._register(addDisposableListener(iconContainer, EventType.CLICK, (e: MouseEvent) => {
			EventHelper.stop(e, true);
			showIconSelectBox();
		}));
		this._register(addDisposableListener(iconContainer, EventType.KEY_DOWN, e => {
			const event = new StandardKeyboardEvent(e);
			if (event.equals(KeyCode.Enter) || event.equals(KeyCode.Space)) {
				EventHelper.stop(event, true);
				showIconSelectBox();
			}
		}));
		this._register(addDisposableListener(iconSelectBox.domNode, EventType.KEY_DOWN, e => {
			const event = new StandardKeyboardEvent(e);
			if (event.equals(KeyCode.Escape)) {
				EventHelper.stop(event, true);
				hoverWidget?.dispose();
				iconContainer.focus();
			}
		}));
		this._register(iconSelectBox.onDidSelect(selectedIcon => {
			hoverWidget?.dispose();
			iconContainer.focus();
			if (this._profileElement.value) {
				this._profileElement.value.element.icon = selectedIcon.id;
			}
		}));
	}

	private renderSelectBox(): void {
		const separator = { text: '\u2500\u2500\u2500\u2500\u2500\u2500', isDisabled: true };
		this.copyFromOptions.push({ text: localize('empty profile', "None") });
		if (this._templates.length) {
			this.copyFromOptions.push({ ...separator, decoratorRight: localize('from templates', "Profile Templates") });
			for (const template of this._templates) {
				this.copyFromOptions.push({ text: template.name, id: template.url, source: URI.parse(template.url) });
			}
		}
		this.copyFromOptions.push({ ...separator, decoratorRight: localize('from existing profiles', "Existing Profiles") });
		for (const profile of this.userDataProfilesService.profiles) {
			this.copyFromOptions.push({ text: profile.name, id: profile.id, source: profile });
		}
		this.copyFromSelectBox.setOptions(this.copyFromOptions);
		this._register(this.copyFromSelectBox.onDidSelect(option => {
			if (this._profileElement.value?.element instanceof NewProfileElement) {
				this._profileElement.value.element.copyFrom = this.copyFromOptions[option.index].source;
			}
		}));
	}

	layout(dimension: Dimension): void {
		this.resourcesTree.layout(dimension.height - 34 - 20 - 25 - 20, dimension.width);
	}

	render(profileElement: AbstractUserDataProfileElement): void {
		const disposables = new DisposableStore();
		this._profileElement.value = { element: profileElement, dispose: () => disposables.dispose() };

		this.renderProfileElement(profileElement);
		disposables.add(profileElement.onDidChange(e => this.renderProfileElement(profileElement)));

		const profile = profileElement instanceof UserDataProfileElement ? profileElement.profile : undefined;
		this.nameInput.setEnabled(!profile?.isDefault);

		this.resourcesTree.setInput(profileElement);
		disposables.add(profileElement.onDidChange(e => {
			if (e.flags || e.copyFrom) {
				const viewState = this.resourcesTree.getViewState();
				this.resourcesTree.setInput(profileElement, {
					...viewState,
					expanded: viewState.expanded?.map(e => e)
				});
			}
		}));

		if (profileElement.primaryAction) {
			this.buttonContainer.classList.remove('hide');
			const button = disposables.add(new Button(this.buttonContainer, {
				supportIcons: true,
				...defaultButtonStyles
			}));
			button.label = profileElement.primaryAction.label;
			button.enabled = profileElement.primaryAction.enabled;
			disposables.add(button.onDidClick(() => this.editorProgressService.showWhile(profileElement.primaryAction!.run())));
			disposables.add(profileElement.primaryAction.onDidChange((e) => {
				if (!isUndefined(e.enabled)) {
					button.enabled = profileElement.primaryAction!.enabled;
				}
			}));
			disposables.add(profileElement.onDidChange(e => {
				if (e.message) {
					button.setTitle(profileElement.message ?? profileElement.primaryAction!.label);
					button.element.classList.toggle('error', !!profileElement.message);
				}
			}));
		} else {
			this.buttonContainer.classList.add('hide');
		}

		this.toolbar.setActions(profileElement.titleActions[0].slice(0), profileElement.titleActions[1].slice(0));

		this.nameInput.focus();
		if (profileElement instanceof NewProfileElement) {
			this.nameInput.select();
		}
	}

	private renderProfileElement(profileElement: AbstractUserDataProfileElement): void {
		this.profileTitle.textContent = profileElement.name;
		this.nameInput.value = profileElement.name;
		if (profileElement.icon) {
			this.iconElement.className = ThemeIcon.asClassName(ThemeIcon.fromId(profileElement.icon));
		} else {
			this.iconElement.className = ThemeIcon.asClassName(ThemeIcon.fromId(DEFAULT_ICON.id));
		}
		if (profileElement instanceof NewProfileElement) {
			this.copyFromContainer.classList.remove('hide');
			const id = profileElement.copyFrom instanceof URI ? profileElement.copyFrom.toString() : profileElement.copyFrom?.id;
			const index = id
				? this.copyFromOptions.findIndex(option => option.id === id)
				: 0;
			if (index !== -1) {
				this.copyFromSelectBox.setOptions(this.copyFromOptions);
				this.copyFromSelectBox.setEnabled(true);
				this.copyFromSelectBox.select(index);
			} else {
				this.copyFromSelectBox.setOptions([{ text: basename(profileElement.copyFrom as URI) }]);
				this.copyFromSelectBox.setEnabled(false);
			}
		} else {
			this.copyFromContainer.classList.add('hide');
		}
	}
}


interface ProfileResourceTreeElement {
	element: ProfileResourceType | IProfileResourceChildTreeItem;
	root: AbstractUserDataProfileElement;
}

class ProfileResourceTreeElementDelegate implements IListVirtualDelegate<ProfileResourceTreeElement> {
	getTemplateId(element: ProfileResourceTreeElement) {
		if (!isString(element.element)) {
			return ProfileResourceChildTreeItemRenderer.TEMPLATE_ID;
		}
		if (element.root instanceof NewProfileElement) {
			return NewProfileResourceTreeRenderer.TEMPLATE_ID;
		}
		return ExistingProfileResourceTreeRenderer.TEMPLATE_ID;
	}
	getHeight(element: ProfileResourceTreeElement) {
		return 30;
	}
}

class ProfileResourceTreeDataSource implements IAsyncDataSource<AbstractUserDataProfileElement, ProfileResourceTreeElement> {

	constructor(
		@IEditorProgressService private readonly editorProgressService: IEditorProgressService,
	) { }

	hasChildren(element: AbstractUserDataProfileElement | ProfileResourceTreeElement): boolean {
		if (element instanceof AbstractUserDataProfileElement) {
			return true;
		}
		if (isString(element.element)) {
			if (element.root.getFlag(element.element)) {
				return false;
			}
			if (element.root instanceof NewProfileElement) {
				return element.root.copyFrom !== undefined;
			}
			return true;
		}
		return false;
	}

	async getChildren(element: AbstractUserDataProfileElement | ProfileResourceTreeElement): Promise<ProfileResourceTreeElement[]> {
		if (element instanceof AbstractUserDataProfileElement) {
			const resourceTypes = [
				ProfileResourceType.Settings,
				ProfileResourceType.Keybindings,
				ProfileResourceType.Snippets,
				ProfileResourceType.Tasks,
				ProfileResourceType.Extensions
			];
			return resourceTypes.map(resourceType => ({ element: resourceType, root: element }));
		}
		if (isString(element.element)) {
			const progressRunner = this.editorProgressService.show(true);
			try {
				const extensions = await element.root.getChildren(element.element);
				return extensions.map(extension => ({ element: extension, root: element.root }));
			} finally {
				progressRunner.done();
			}
		}
		return [];
	}
}

interface IProfileResourceTemplateData {
	readonly disposables: DisposableStore;
	readonly elementDisposables: DisposableStore;
}

interface IExistingProfileResourceTemplateData extends IProfileResourceTemplateData {
	readonly checkbox: Checkbox;
	readonly label: HTMLElement;
	readonly description: HTMLElement;
}

interface INewProfileResourceTemplateData extends IProfileResourceTemplateData {
	readonly label: HTMLElement;
	readonly selectContainer: HTMLElement;
	readonly selectBox: SelectBox;
}

interface IProfileResourceChildTreeItemTemplateData extends IProfileResourceTemplateData {
	readonly checkbox: Checkbox;
	readonly resourceLabel: IResourceLabel;
}

class AbstractProfileResourceTreeRenderer extends Disposable {

	protected getResourceTypeTitle(resourceType: ProfileResourceType): string {
		switch (resourceType) {
			case ProfileResourceType.Settings:
				return localize('settings', "Settings");
			case ProfileResourceType.Keybindings:
				return localize('keybindings', "Keyboard Shortcuts");
			case ProfileResourceType.Snippets:
				return localize('snippets', "User Snippets");
			case ProfileResourceType.Tasks:
				return localize('tasks', "User Tasks");
			case ProfileResourceType.Extensions:
				return localize('extensions', "Extensions");
		}
		return '';
	}

	disposeElement(element: ITreeNode<ProfileResourceTreeElement, void>, index: number, templateData: IProfileResourceTemplateData, height: number | undefined): void {
		templateData.elementDisposables.clear();
	}

	disposeTemplate(templateData: IProfileResourceTemplateData): void {
		templateData.disposables.dispose();
	}
}


class ExistingProfileResourceTreeRenderer extends AbstractProfileResourceTreeRenderer implements ITreeRenderer<ProfileResourceTreeElement, void, IExistingProfileResourceTemplateData> {

	static readonly TEMPLATE_ID = 'ExistingProfileResourceTemplate';

	readonly templateId = ExistingProfileResourceTreeRenderer.TEMPLATE_ID;

	renderTemplate(parent: HTMLElement): IExistingProfileResourceTemplateData {
		const disposables = new DisposableStore();
		const container = append(parent, $('.profile-tree-item-container.existing-profile-resource-type-container'));
		const checkbox = disposables.add(new Checkbox('', false, defaultCheckboxStyles));
		append(container, checkbox.domNode);
		const label = append(container, $('.profile-resource-type-label'));
		const description = append(container, $('.profile-resource-type-description', undefined, localize('using defaults', "Using Default Profile")));
		return { checkbox, label, description, disposables, elementDisposables: disposables.add(new DisposableStore()) };
	}

	renderElement({ element: profileResourceTreeElement }: ITreeNode<ProfileResourceTreeElement, void>, index: number, templateData: IExistingProfileResourceTemplateData, height: number | undefined): void {
		templateData.elementDisposables.clear();
		const { element, root } = profileResourceTreeElement;
		if (!(root instanceof UserDataProfileElement)) {
			throw new Error('ExistingProfileResourceTreeRenderer can only render existing profile element');
		}
		if (!isString(element)) {
			throw new Error('ExistingProfileResourceTreeRenderer can only render profile resource types');
		}

		templateData.label.textContent = this.getResourceTypeTitle(element);
		if (root instanceof UserDataProfileElement && root.profile.isDefault) {
			templateData.checkbox.checked = true;
			templateData.checkbox.disable();
			templateData.description.classList.add('hide');
		} else {
			templateData.checkbox.enable();
			const checked = !root.getFlag(element);
			templateData.checkbox.checked = checked;
			templateData.description.classList.toggle('hide', checked);
			templateData.elementDisposables.add(templateData.checkbox.onChange(() => root.setFlag(element, !templateData.checkbox.checked)));
			templateData.elementDisposables.add(root.onDidChange(e => {
				if (e.flags) {
					templateData.description.classList.toggle('hide', !root.getFlag(element));
				}
			}));
		}
	}

}

class NewProfileResourceTreeRenderer extends AbstractProfileResourceTreeRenderer implements ITreeRenderer<ProfileResourceTreeElement, void, INewProfileResourceTemplateData> {

	static readonly TEMPLATE_ID = 'NewProfileResourceTemplate';

	readonly templateId = NewProfileResourceTreeRenderer.TEMPLATE_ID;

	constructor(
		@IContextViewService private readonly contextViewService: IContextViewService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super();
	}

	renderTemplate(parent: HTMLElement): INewProfileResourceTemplateData {
		const disposables = new DisposableStore();
		const container = append(parent, $('.profile-tree-item-container.new-profile-resource-type-container'));
		const labelContainer = append(container, $('.profile-resource-type-label-container'));
		const label = append(labelContainer, $('span.profile-resource-type-label'));
		const selectBox = this._register(this.instantiationService.createInstance(SelectBox,
			[
				{ text: localize('empty', "Empty") },
				{ text: localize('copy', "Copy") },
				{ text: localize('default', "Use Default Profile") }
			],
			0,
			this.contextViewService,
			defaultSelectBoxStyles,
			{
				useCustomDrawn: true,
			}
		));
		const selectContainer = append(container, $('.profile-select-container'));
		selectBox.render(selectContainer);

		return { label, selectContainer, selectBox, disposables, elementDisposables: disposables.add(new DisposableStore()) };
	}

	renderElement({ element: profileResourceTreeElement }: ITreeNode<ProfileResourceTreeElement, void>, index: number, templateData: INewProfileResourceTemplateData, height: number | undefined): void {
		templateData.elementDisposables.clear();
		const { element, root } = profileResourceTreeElement;
		if (!(root instanceof NewProfileElement)) {
			throw new Error('NewProfileResourceTreeRenderer can only render new profile element');
		}
		if (!isString(element)) {
			throw new Error('NewProfileResourceTreeRenderer can only profile resoyrce types');
		}
		templateData.label.textContent = this.getResourceTypeTitle(element);
		templateData.selectBox.select(root.getCopyFlag(element) ? 1 : root.getFlag(element) ? 2 : 0);
		templateData.elementDisposables.add(templateData.selectBox.onDidSelect(option => {
			root.setFlag(element, option.index === 2);
			root.setCopyFlag(element, option.index === 1);
		}));
	}
}

class ProfileResourceChildTreeItemRenderer extends AbstractProfileResourceTreeRenderer implements ITreeRenderer<ProfileResourceTreeElement, void, IProfileResourceChildTreeItemTemplateData> {

	static readonly TEMPLATE_ID = 'ProfileResourceChildTreeItemTemplate';

	readonly templateId = ProfileResourceChildTreeItemRenderer.TEMPLATE_ID;
	private readonly labels: ResourceLabels;
	private readonly hoverDelegate: IHoverDelegate;

	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();
		this.labels = instantiationService.createInstance(ResourceLabels, DEFAULT_LABELS_CONTAINER);
		this.hoverDelegate = this._register(instantiationService.createInstance(WorkbenchHoverDelegate, 'mouse', false, {}));
	}

	renderTemplate(parent: HTMLElement): IProfileResourceChildTreeItemTemplateData {
		const disposables = new DisposableStore();
		const container = append(parent, $('.profile-tree-item-container.profile-resource-child-container'));
		const checkbox = disposables.add(new Checkbox('', false, defaultCheckboxStyles));
		append(container, checkbox.domNode);
		const resourceLabel = disposables.add(this.labels.create(container, { hoverDelegate: this.hoverDelegate }));
		return { checkbox, resourceLabel, disposables, elementDisposables: disposables.add(new DisposableStore()) };
	}

	renderElement({ element: profileResourceTreeElement }: ITreeNode<ProfileResourceTreeElement, void>, index: number, templateData: IProfileResourceChildTreeItemTemplateData, height: number | undefined): void {
		templateData.elementDisposables.clear();
		const { element } = profileResourceTreeElement;
		if (isString(element)) {
			throw new Error('NewProfileResourceTreeRenderer can only render profile resource child tree items');
		}
		if (element.checkbox) {
			templateData.checkbox.domNode.classList.remove('hide');
			templateData.checkbox.checked = element.checkbox.isChecked;
			templateData.checkbox.domNode.ariaLabel = element.checkbox.accessibilityInformation?.label ?? '';
			if (element.checkbox.accessibilityInformation?.role) {
				templateData.checkbox.domNode.role = element.checkbox.accessibilityInformation.role;
			}
		} else {
			templateData.checkbox.domNode.classList.add('hide');
		}

		const resource = URI.revive(element.resourceUri);
		templateData.resourceLabel.setResource(
			{
				name: resource ? basename(resource) : element.label?.label,
				description: isString(element.description) ? element.description : undefined,
				resource
			},
			{
				forceLabel: true,
				hideIcon: !resource,
			});
	}

}

export class UserDataProfilesEditorInput extends EditorInput {
	static readonly ID: string = 'workbench.input.userDataProfiles';
	readonly resource = undefined;

	private readonly model: UserDataProfilesEditorModel;

	private _dirty: boolean = false;
	get dirty(): boolean { return this._dirty; }
	set dirty(dirty: boolean) {
		if (this._dirty !== dirty) {
			this._dirty = dirty;
			this._onDidChangeDirty.fire();
		}
	}

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super();
		this.model = UserDataProfilesEditorModel.getInstance(this.instantiationService);
		this._register(this.model.onDidChange(e => this.dirty = this.model.profiles.some(profile => profile instanceof NewProfileElement)));
	}

	override get typeId(): string { return UserDataProfilesEditorInput.ID; }
	override getName(): string { return localize('userDataProfiles', "Profiles"); }
	override getIcon(): ThemeIcon | undefined { return defaultUserDataProfileIcon; }

	override async resolve(): Promise<UserDataProfilesEditorModel> {
		return this.model;
	}

	override isDirty(): boolean {
		return this.dirty;
	}

	override async save(): Promise<EditorInput> {
		await this.model.saveNewProfile();
		return this;
	}

	override async revert(): Promise<void> {
		this.model.revert();
	}

	override matches(otherInput: EditorInput | IUntypedEditorInput): boolean { return otherInput instanceof UserDataProfilesEditorInput; }
}

export class UserDataProfilesEditorInputSerializer implements IEditorSerializer {
	canSerialize(editorInput: EditorInput): boolean { return true; }
	serialize(editorInput: EditorInput): string { return ''; }
	deserialize(instantiationService: IInstantiationService): EditorInput { return instantiationService.createInstance(UserDataProfilesEditorInput); }
}
