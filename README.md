# Writing Log for Obsidian

**Writing Log** is a session-based word count tracker for Obsidian. Unlike the standard word counter which shows the *total* words in a note, this plugin tracks how many words you **add** or **remove** during a specific writing session across multiple files.

It is perfect for writers, novelists, or academics who want to track their daily productivity (e.g., "I wrote 500 net words today") regardless of which files they edited.

## Features

  * **Session Tracking:** Explicitly Start and Stop writing sessions.
  * **Granular Stats:** Tracks **Added**, **Removed**, and **Net** word counts.
  * **Multi-File Support:** Automatically tracks changes across any file you modify while the session is active.
  * **Accurate Word Detection:** Uses robust Unicode-aware logic to match Obsidian's native word count (handles international characters, smart apostrophes, and ignores Markdown syntax).
  * **Auto-Generated Summaries:** Appends a Markdown table summary to a log file when you finish a session.
  * **Status Bar:** Shows the current state (Active/Inactive) at a glance.
  * **Rename Safety:** Keeps tracking files even if you rename them in the middle of a session.

## How it Works

1.  **Start a Session:** Open the Command Palette and select `Writing Log: Start Writing Session`. The status bar will change to "Writing Log: Active".
2.  **Write:** Edit your notes as usual. You can switch between different files; the plugin tracks changes in the background.
3.  **View Progress (Optional):** If you want to see how you are doing without stopping, run `Writing Log: View Writing Log Summary`. This appends a snapshot of the current stats to your log file.
4.  **Stop the Session:** When you are finished, run `Writing Log: Stop Writing Session`.
5.  **Review:** Open your log file (default: `Writing Log Summary.md`) to see the table of your activity.

### Example Output

When a session ends, a table like this is appended to your log file:

```markdown
## Session Summary - 11/28/2025, 4:00:00 PM

| File | Added | Removed | Net |
|---|---|---|---|
| Chapter 1.md | 540 | 12 | 528 |
| Character Notes.md | 100 | 50 | 50 |
| **Total** | **640** | **62** | **578** |
```

## Commands

| Command | Description |
| :--- | :--- |
| `Start Writing Session` | Resets counters and begins tracking changes in all modified files. |
| `Stop Writing Session` | Ends the session, clears the cache, and writes the final summary to the log file. |
| `View Writing Log Summary` | Writes the *current* stats to the log file without stopping the active session. |

## Settings

  * **Summary File Name:** The path of the file where logs will be appended.
      * *Default:* `Writing Log Summary.md`

## Installation

### Manual Installation

1.  Download the latest release (containing `main.js`, `manifest.json`, and `styles.css`).
2.  Create a folder named `obsidian-writing-log` inside `.obsidian/plugins/`.
3.  Move the downloaded files into that folder.
4.  Reload Obsidian and enable the plugin in settings.

## Logic & Accuracy

This plugin uses a Unicode-aware Regular Expression (`\p{L}` and `\p{N}`) to detect words.

  * It correctly identifies words in non-English scripts (CJK, Cyrillic, etc.).
  * It ignores Markdown formatting (e.g., `**Bold**` counts as "Bold").
  * It correctly handles contractions and hyphenated words (e.g., "don’t" or "long-term").
