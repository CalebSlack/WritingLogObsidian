import {
  App,
  Plugin,
  Notice,
  TFile,
  PluginManifest,
  PluginSettingTab,
  Setting,
  TAbstractFile,
  normalizePath,
} from 'obsidian';

interface FileLog {
  added: number;
  removed: number;
  net: number;
}

interface WritingLogPluginSettings {
  startTime: Date;
  isSessionActive: boolean;
  trackedFiles: Record<string, string>;
  sessionLog: Record<string, FileLog>;
  summaryFileName: string;
}

export const DEFAULT_SETTINGS: WritingLogPluginSettings = {
  startTime: new Date(),
  isSessionActive: false,
  trackedFiles: {},
  sessionLog: {},
  summaryFileName: 'Writing Log Summary.md',
};

export default class WritingLogPlugin extends Plugin {
  settings: WritingLogPluginSettings = DEFAULT_SETTINGS;
  readonly openFiles = new Set<TFile>();

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
  }

  async onload() {
    await this.loadSettings();

    // Perform some actions with the ribbon icon, for example add a class to it.
    // ribbonIconEl.addClass('my-plugin-ribbon-class');

    const statusBarItemEl = this.addStatusBarItem();
    this.updateStatusBar(statusBarItemEl);

    this.addSettingTab(new WritingLogSettingTab(this.app, this));

    this.addCommand({
      id: 'start-writing-session',
      name: 'Start Writing Session',
      callback: async () => this.handleStartSessionCommand(statusBarItemEl),
    });

    this.addCommand({
      id: 'stop-writing-session',
      name: 'Stop Writing Session',
      callback: async () => this.handleStopCurrentSession(statusBarItemEl),
    });

    this.addCommand({
      id: 'view-writing-log-summary',
      name: 'View Writing Log Summary',
      callback: async () => this.handleViewCurrentSessionSummary(),
    });

    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(
        this.app.vault.on('modify', async (file) =>
          this.updateSessionStatus(file)
        )
      );

      this.registerEvent(
        (this.app.workspace as any).on('file-open', async (file: TFile) =>
          this.handleFileOpen(file)
        )
      );

      this.registerEvent(
        this.app.workspace.on('active-leaf-change' as any, async (leaf) =>
          this.handleActiveLeafChange(leaf)
        )
      );

      this.registerEvent(
        this.app.vault.on('rename', async (file, oldPath) =>
          this.handleRename(file, oldPath)
        )
      );
    });
  }

  onunload() {
    return;
  }

  updateStatusBar(statusBarItemEl: HTMLElement) {
    if (this.settings.isSessionActive) {
      statusBarItemEl.setText('Writing Log: Active');
    } else {
      statusBarItemEl.setText('Writing Log: Inactive');
    }
  }

  async loadSettings() {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private async handleStopCurrentSession(statusBarItemEl: HTMLElement) {
    if (!this.settings.isSessionActive) {
      return new Notice("Can't stop a session that hasn't been started...");
    }
    this.settings.isSessionActive = false;
    const summary = generateSessionSummary(this.settings);

    const summaryFilePath = this.settings.summaryFileName;
    const contentToAppend = `

## Session Summary - ${this.settings.startTime.toLocaleString()}

${getSummaryTimeString(this.settings)}

${summary}`;

    await this.updateSummaryFile(contentToAppend);
    this.settings.trackedFiles = {}; // Clear tracked files after session ends
    this.settings.sessionLog = {}; // Clear session log after summary is generated
    await this.saveSettings();
    this.updateStatusBar(statusBarItemEl);
    return new Notice(
      `Writing session stopped! Summary written to ${summaryFilePath}.`
    );
  }

  private async handleViewCurrentSessionSummary() {
    const summary = generateSessionSummary(this.settings);

    const currentSummary = `

## Current Session Summary - ${this.settings.startTime.toLocaleString()}

${getSummaryTimeString(this.settings)}

${summary}`;

    return new Notice(currentSummary);
  }

  private async handleStartSessionCommand(statusBarItemEl: HTMLElement) {
    if (this.settings.isSessionActive) {
      return new Notice(
        'Writing session already active, stop this one before starting another'
      );
    }
    this.settings.isSessionActive = true;
    this.settings.startTime = new Date();
    this.settings.sessionLog = {}; // Clear previous session's log
    await this.saveSettings();
    this.updateStatusBar(statusBarItemEl);
    return new Notice('Writing session started!');
  }

  private async handleRename(file: TAbstractFile, oldPath: string) {
    if (!this.settings.isSessionActive) {
      return;
    }
    if (!(file instanceof TFile)) {
      return;
    }
    console.debug(`File renamed from ${oldPath} to ${file.path}`);

    // Update trackedFiles
    if (this.settings.trackedFiles[oldPath]) {
      this.settings.trackedFiles[file.path] =
        this.settings.trackedFiles[oldPath];
      delete this.settings.trackedFiles[oldPath];
    }

    // Update sessionLog
    if (this.settings.sessionLog[oldPath]) {
      this.settings.sessionLog[file.path] = this.settings.sessionLog[oldPath];
      delete this.settings.sessionLog[oldPath];
    } else if (!this.settings.sessionLog[file.path]) {
      // If the file was renamed before any modification during the session, initialize its log
      this.initFileSessionLog(file.path);
    }
    await this.saveSettings();
  }

  private async handleFileOpen(file: TFile) {
    this.openFiles.add(file);
    if (this.settings.trackedFiles[file.path]) {
      return;
    }
    this.settings.trackedFiles[file.path] =
      await this.app.vault.cachedRead(file);
    this.initFileSessionLog(file.path);
  }

  private async handleActiveLeafChange(leaf: any) {
    const currentFile = leaf?.view?.file;

    for (const file of this.openFiles) {
      if (!currentFile || currentFile.path !== file.path) {
        this.openFiles.delete(file);
        this.settings.trackedFiles[file.path] = ''; // Reset to empty to save space
      }
    }
  }

  private async updateSessionStatus(file: TAbstractFile) {
    if (!this.settings.isSessionActive) {
      return;
    }
    if (!(file instanceof TFile)) {
      return;
    }

    const currentContent = await this.app.vault.cachedRead(file);
    const oldContent = this.settings.trackedFiles[file.path] || '';

    const { added, removed } = getWordDiff(oldContent, currentContent);

    this.initFileSessionLog(file.path);

    this.settings.sessionLog[file.path].added += added;
    this.settings.sessionLog[file.path].removed += removed;
    this.settings.sessionLog[file.path].net =
      this.settings.sessionLog[file.path].added -
      this.settings.sessionLog[file.path].removed;

    this.settings.trackedFiles[file.path] = currentContent; // Update for next comparison
    await this.saveSettings();
    console.debug(
      `File: ${file.path}, Added: ${added}, Removed: ${removed}, Net: ${this.settings.sessionLog[file.path].net}`
    );
  }

  private async getSummaryFileExistingContent() {
    try {
      return await this.app.vault.adapter.read(
        normalizePath(this.settings.summaryFileName)
      );
    } catch (e) {
      console.error('Error getting file: ', e);
      new Notice('Failed to find existing Summary File, creating a new one...');
      return '';
    }
  }

  private async updateSummaryFile(contentToAppend: string) {
    const existingContent = await this.getSummaryFileExistingContent();
    await this.app.vault.adapter.write(
      normalizePath(this.settings.summaryFileName),
      existingContent + contentToAppend
    );
  }

  private initFileSessionLog(filePath: string) {
    if (!this.settings.sessionLog[filePath]) {
      console.debug(`${filePath} not tracked in session log, creating 0 value`);
      this.settings.sessionLog[filePath] = { added: 0, removed: 0, net: 0 };
    }
  }
}

class WritingLogSettingTab extends PluginSettingTab {
  plugin: WritingLogPlugin;

  constructor(app: App, plugin: WritingLogPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Writing Log Settings' });

    new Setting(containerEl)
      .setName('Summary File Name')
      .setDesc(
        'The name of the markdown file where the writing session summaries will be saved. (e.g., Writing Log Summary.md)'
      )
      .addText((text) =>
        text
          .setPlaceholder('Writing Log Summary.md')
          .setValue(this.plugin.settings.summaryFileName)
          .onChange(async (value) => {
            this.plugin.settings.summaryFileName = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

function generateSessionSummary(settings: WritingLogPluginSettings): string {
  let summary = `| File | Added | Removed | Net |
|---|---|---|---|`;
  let totalAdded = 0;
  let totalRemoved = 0;
  let totalNet = 0;

  for (const filePath in settings.sessionLog) {
    const log = settings.sessionLog[filePath];
    summary += `\n| ${filePath} | ${log.added} | ${log.removed} | ${log.net} |`;
    totalAdded += log.added;
    totalRemoved += log.removed;
    totalNet += log.net;
  }

  summary += `\n| **Total** | **${totalAdded}** | **${totalRemoved}** | **${totalNet}** |`;
  return summary;
}

function getWordDiff(
  oldContent: string,
  newContent: string
): { added: number; removed: number } {
  const getTokens = (text: string) => {
    // \p{L} = Any Unicode Letter
    // \p{N} = Any Unicode Number
    // We use \u2019 instead of the literal ’ to avoid IDE warnings about ambiguous characters
    const matches = text.match(/[\p{L}\p{N}]+(?:[-'\u2019][\p{L}\p{N}]+)*/gu);
    return matches ? matches.map((w) => w.toLowerCase()) : [];
  };

  const oldWords = getTokens(oldContent);
  const newWords = getTokens(newContent);

  let added = 0;
  let removed = 0;

  // Frequency Map for Old Content
  const oldWordCounts = new Map<string, number>();
  oldWords.forEach((word) =>
    oldWordCounts.set(word, (oldWordCounts.get(word) || 0) + 1)
  );

  // Frequency Map for New Content
  const newWordCounts = new Map<string, number>();
  newWords.forEach((word) =>
    newWordCounts.set(word, (newWordCounts.get(word) || 0) + 1)
  );

  // Calculate Added
  newWordCounts.forEach((count, word) => {
    const oldCount = oldWordCounts.get(word) || 0;
    if (count > oldCount) {
      added += count - oldCount;
    }
  });

  // Calculate Removed
  oldWordCounts.forEach((count, word) => {
    const newCount = newWordCounts.get(word) || 0;
    if (count > newCount) {
      removed += count - newCount;
    }
  });

  return { added, removed };
}

function getSummaryTimeString(settings: WritingLogPluginSettings) {
  const now = new Date();
  const durationObject = getDurationObject(
    now.getTime() - settings.startTime.getTime()
  );
  return `
Start: ${settings.startTime.toLocaleString()} 
End: ${new Date().toLocaleString()}
Duration: ${getDurationString(durationObject)}
`;
}

function getDurationString(durationObject: {
  hours: number;
  minutes: number;
  seconds: number;
}) {
  return `Hours: ${durationObject.hours}, Minutes: ${durationObject.minutes}, Seconds: ${durationObject.seconds}`;
}

function getDurationObject(durationMs: number) {
  // Convert milliseconds to total seconds
  const totalSeconds = Math.floor(durationMs / 1000);

  // Calculate hours, minutes, and seconds
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / (60 * 60)); // totalSeconds / 3600

  return {
    hours: hours,
    minutes: minutes,
    seconds: seconds,
  };
}
