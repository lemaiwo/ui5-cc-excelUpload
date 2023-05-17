import Dialog from "sap/m/Dialog";
import { Messages, MessageTypes, ListObject, ArrayData, PayloadArray } from "../types";
import ExcelUpload from "./ExcelUpload";
import Util from "./Util";
import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import { MessageType, ValueState } from "sap/ui/core/library";

export default class MessageHandler {
	private messages: Messages[] = [];
	private excelUploadController: ExcelUpload;
	private messageDialog: Dialog;

	constructor(excelUploadController: any) {
		this.messages = [];
		this.excelUploadController = excelUploadController;
	}

	setMessages(messages: Messages[]) {
		this.messages = messages;
	}

	addToErrorsResults(messages: Messages[]) {
		this.messages = this.messages.concat(messages);
	}

	addMessageToMessages(messages: Messages) {
		this.messages.push(messages);
	}

	getMessages() {
		return this.messages;
	}

	checkMandatoryColumns(data: PayloadArray, columnNames: string[], mandatoryFieldsUser: string[], mandatoryFieldsMetadata: string[], typeLabelList: ListObject) {
		// concat mandatory fields arrays and remove duplicates
		const mandatoryFields = [...new Set([...mandatoryFieldsUser, ...mandatoryFieldsMetadata])];
		// check if column is in the data list
		//const availableKeyColumns = this.checkKeyColumns(columnNames, mandatoryFields, typeLabelList);
		// check if data is filled in for available columns
		this.checkMandatoryFields(data, mandatoryFields, typeLabelList);
	}

	checkMandatoryFields(data: ArrayData, mandatoryFields: string[], typeLabelList: ListObject) {
		if (!mandatoryFields) {
			return;
		}
		for (const mandatoryField of mandatoryFields) {
			const fieldLabel = typeLabelList[mandatoryField]?.label;
			if (!fieldLabel) {
				console.error(`Mandatory Field ${mandatoryField} not found for checking mandatory fields`);
				continue;
			}

			for (const [index, row] of data.entries()) {
				const value = Util.getValueFromRow(row, fieldLabel, mandatoryField, this.excelUploadController.component.getFieldMatchType());
				const errorMessage = {
					title: this.excelUploadController.util.geti18nText("mandatoryFieldNotFilled", [fieldLabel]),
					type: MessageTypes.MandatoryFieldNotFilled,
					row: index + 2,
					counter: 1,
					ui5type: MessageType.Error
				} as Messages;
				// no value found or value is empty, create error message
				if (!value || value.rawValue === "" || value.rawValue === undefined) {
					this.messages.push(errorMessage);
				}
			}
		}
	}

	checkFormat(data: ArrayData) {
		for (const [index, row] of data.entries()) {
			Object.values(row).forEach(({sheetDataType, format, rawValue, formattedValue}) => {
				if (sheetDataType === 'n' && format !== 'General' && rawValue !== Number(formattedValue)) {
					const warningMessage = {
						title: "Format",
						type: MessageTypes.Formatting,
						row: index + 2,
						counter: 1,
						ui5type: MessageType.Warning,
						rawValue: rawValue,
						formattedValue: formattedValue
					} as Messages;
					this.messages.push(warningMessage);
				}
			});
		}
	}

	checkColumnNames(columnNames: string[], fieldMatchType: string, typeLabelList: ListObject) {
		for (let index = 0; index < columnNames.length; index++) {
			const columnName = columnNames[index];
			let found = false;
			for (const key in typeLabelList) {
				if (typeLabelList.hasOwnProperty(key)) {
					if (fieldMatchType === "label") {
						if (typeLabelList[key].label === columnName) {
							found = true;
							break;
						}
					}
					if (fieldMatchType === "labelTypeBrackets") {
						if (columnName.includes(`[${key}]`)) {
							found = true;
							break;
						}
					}
				}
			}
			if (!found) {
				const errorMessage = {
					title: this.excelUploadController.util.geti18nText("columnNotFound", [columnName]),
					type: MessageTypes.ColumnNotFound,
					counter: 1,
					ui5type: MessageType.Error
				} as Messages;
				this.messages.push(errorMessage);
			}
		}
	}

	checkKeyColumns(columnNames: string[], odataKeyList: string[], typeLabelList: ListObject) {
		const availableKeyColumns = [];
		for (let index = 0; index < odataKeyList.length; index++) {
			const columnName = odataKeyList[index];
			let found = false;
			for (const index in columnNames) {
				if (columnNames[index].includes(`[${columnName}]`)) {
					found = true;
					availableKeyColumns.push(columnName);
					break;
				}
			}
			if (!found) {
				const columnNameLabel = typeLabelList[columnName]?.label ? typeLabelList[columnName].label : columnName;
				const errorMessage: Messages = {
					title: this.excelUploadController.util.geti18nText("keyColumnNotFound", [columnNameLabel]),
					type: MessageTypes.ColumnNotFound,
					counter: 1,
					ui5type: MessageType.Error,
				};
				this.messages.push(errorMessage);
			}
		}
		return availableKeyColumns;
	}

	areMessagesPresent(): boolean {
		if (this.messages.some((message) => message.counter > 0)) {
			return true;
		}
		return false;
	}

	/**
	 * Display messages.
	 */
	async displayMessages() {
		if (!this.messageDialog) {
			this.messageDialog = (await Fragment.load({
				name: "cc.excelUpload.XXXnamespaceXXX.fragment.MessagesDialog",
				type: "XML",
				controller: this,
			})) as Dialog;
		}
		this.messageDialog.setModel(this.excelUploadController.componentI18n, "i18n");
		this.messageDialog.setModel(new JSONModel(), "messages");
		const messagesGrouped = this.groupMessages(this.messages);
		const sortedMessagesGrouped = this.sortMessagesByTitle(messagesGrouped);
		(this.messageDialog.getModel("messages") as JSONModel).setData(sortedMessagesGrouped);
		const dialogState = this.getWorstType(sortedMessagesGrouped);
		const infoModel = new JSONModel({
			strict: this.excelUploadController.component.getStrict(),
			dialogState: dialogState,
		});
		this.messageDialog.setModel(infoModel, "info");
		this.messageDialog.open();
	}

	groupMessages(messages: Messages[]): Messages[] {
		const counterLargerThanOne = messages.filter((message) => message.counter !== 0);
		const parsingMessages = counterLargerThanOne.filter((message) => message.type.group === true);
		const messageGroups = parsingMessages.reduce((groups, message) => {
			let messageText = "";
			if (!groups[message.title]) {
				groups[message.title] = [];
			}
			if (message.rawValue && message.formattedValue) {
				messageText = this.excelUploadController.util.geti18nText("errorInRowWithValueFormatted", [message.row, message.formattedValue, message.rawValue]);
			} else if (message.rawValue) {
				messageText = this.excelUploadController.util.geti18nText("errorInRowWithValue", [message.row, message.rawValue]);
			} else {
				messageText = this.excelUploadController.util.geti18nText("errorInRow", [message.row]);
			}
			groups[message.title].push(messageText);
			return groups;
		}, {});

		const groupedMessages = [];
		for (const title in messageGroups) {
			const ui5type = messages.find(message => message.title === title)?.ui5type || "";
			groupedMessages.push({
				title: title,
				description: messageGroups[title].join("\n"),
				ui5type: ui5type
			});
		}
		const allMessages = groupedMessages.concat(counterLargerThanOne.filter((message) => message.type.group === false));

		return allMessages;
	}

	private onCloseMessageDialog() {
		this.messageDialog.close();
		// rest file uploader content
		this.excelUploadController.resetContent();
	}

	private onContinue() {
		this.messageDialog.close();
		this.excelUploadController.setDataRows();
	}

	private sortMessagesByTitle(messages: Messages[]) {
		return messages.sort((a, b) => {
			if (a.title < b.title) {
				return -1;
			}
			if (a.title > b.title) {
				return 1;
			}
			return 0;
		});
	}

	private getWorstType(messages: Messages[]): ValueState {
		let worstType = MessageType.None;
	
		// Map MessageType to severity levels
		const severity = {
			[MessageType.None]: 0,
			[MessageType.Information]: 1,
			[MessageType.Success]: 2,
			[MessageType.Warning]: 3,
			[MessageType.Error]: 4,
		};
	
		for (const message of messages) {
			if (severity[message.ui5type] > severity[worstType]) {
				worstType = message.ui5type;
			}
		}
	
		// Convert MessageType to ValueState
		return worstType as unknown as ValueState;
	}
	
	
	
	
}