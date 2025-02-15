// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GitExtension } from './types/git';
import CommitType from './config/commit-type';
import { CommitDetailType, CommitDetailQuickPickOptions, MaxSubjectWords } from './config/commit-detail';
import CommitInputType from './config/commit-input';
export interface GitMessage {
    [index: string]: string;
    type: string;
    scope: string;
    subject: string;
    body: string;
    footer: string;
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    //获取是否在git扩展内 Gets whether it is in the git extension
    function getGitExtension() {
        const vscodeGit = vscode.extensions.getExtension<GitExtension>('vscode.git');
        const gitExtension = vscodeGit && vscodeGit.exports;
        return gitExtension;
    }
    //Commit message config
    const message_config: GitMessage = {
        type: '',
        scope: '',
        subject: '',
        body: '',
        footer: ''
    };
    //清除填写信息 Clear message
    function clearMessage() {
        Object.keys(message_config).forEach((key) => (message_config[key] = ''));
        CommitDetailType.map((item) => {
            item.isEdit = false;
            return item;
        });
    }
    //组合信息 Portfolio information
    function messageCombine(config: GitMessage) {
        return [`${config.type}${config.scope ? '(' + config.scope + ')' : ''}: ${config.subject}`, config.body, config.footer]
            .filter((item) => item)
            .join('\n\n');
    }
    const gitExtension = getGitExtension();
    if (!gitExtension?.enabled) {
        vscode.window.showErrorMessage('Git extensions are not currently enabled, please try again after enabled!');
        return false;
    }

    //获取当前的 git仓库实例 Get git repo instance
    let repo: any = gitExtension.getAPI(1).repositories[0];
    console.log(repo, 'repo');

    //输入提交详情 Input message detail
    const inputMessageDetail = (_key: string | number) => {
        const _detailType = CommitDetailType.find((item) => item.key === _key);
        CommitInputType.prompt = `${_detailType?.description} 👉 ${_detailType?.detail}`;
        CommitInputType.value = message_config[_key] ? message_config[_key] : '';
        vscode.window.showInputBox(CommitInputType).then((value) => {
            const _value = value || '';
            message_config[_key] = _value;
            _detailType && (_detailType.isEdit = true);
            if (_key === 'subject') {
                const input_value_length = value ? value?.length : 0;
                if (input_value_length > MaxSubjectWords) {
                    vscode.window.showErrorMessage(
                        `The commit overview is no more than ${MaxSubjectWords} words but the current input is ${input_value_length} words`,
                        ...['ok']
                    );
                    inputMessageDetail(_key);
                    return false;
                }
            }
            recursiveInputMessage(startMessageInput);
        });
    };
    // 递归输入信息 Recursive input message
    const recursiveInputMessage = (startMessageInput?: () => void) => {
        CommitDetailQuickPickOptions.placeHolder = '搜索提交描述(Search Commit Describe)';
        const _CommitDetailType: Array<CommitDetailType> = JSON.parse(JSON.stringify(CommitDetailType));
        _CommitDetailType.map((item: any) => {
            if (item.isEdit) {
                item.description = `${item.description} 👍 >> ${message_config[item.key || '']}`;
            }
            return item;
        });
        vscode.window.showQuickPick(_CommitDetailType, CommitDetailQuickPickOptions).then((select) => {
            const label = (select && select.label) || '';
            if (label !== '') {
                const _key = select?.key || 'body';
                if (_key === 'complete') {
                    vscode.commands.executeCommand('workbench.view.scm');
                    repo.inputBox.value = messageCombine(message_config);
                    clearMessage();
                    return false;
                }
                if (_key === 'back') {
                    startMessageInput && startMessageInput();
                    clearMessage();
                    return false;
                }
                inputMessageDetail(_key);
            } else {
                clearMessage();
            }
        });
    };
    //开始输入 Start input
    const startMessageInput = () => {
        CommitDetailQuickPickOptions.placeHolder = '搜索 Git 提交类型(Search Commit Type)';
        vscode.window.showQuickPick(CommitType, CommitDetailQuickPickOptions).then((select) => {
            const label = (select && select.label) || '';
            message_config.type = label;
            if (label !== '') {
                recursiveInputMessage(startMessageInput);
            }
        });
    };
    //点击图标触发快捷选项 Click the icon to trigger shortcut options
    let disposable = vscode.commands.registerCommand('extension.showGitCommit', (uri?) => {
        if (uri) {
            //如果有多个repo 寻找当前的 进行填充 If there are multiple repos looking for the current to populate
            repo = gitExtension.getAPI(1).repositories.find((repo) => {
                return repo.rootUri.path === uri._rootUri.path;
            });
        }
        startMessageInput();
    });
    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
