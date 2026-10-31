# Quick Snapshot Studio: Three-Column Video Capture & Interactive Timeline

A dedicated real-time snapshot mode for FrameScout featuring a professional 3-column editing layout (Settings, Video Player Viewport, Captured Frames List) and a bottom interactive timeline with thumbnail preview markers, precise frame stepping, and keyboard shortcuts.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following key decisions have been aligned based on user preferences:
> 
> - **Mode Integration**: Implemented as a clean **third mode tab** (`Quick Snapshot`) alongside `Batch Extract` and `Last Frame` without altering or breaking existing workflows.
> - **Capture Triggers**: Dual-trigger system featuring **keyboard shortcuts** (`S` or `C` to snapshot, `Space` for play/pause, `Left`/`Right` arrows for frame stepping) plus an on-screen primary **Capture Snapshot** HUD button.
> - **Timeline Architecture**: Full-width interactive scrubber with **timestamp markers where snapshots have been taken**, allowing instant jumping between captured moments, hover time tooltips, and frame-by-frame stepping controls.

---

## 1. Overview & Core Concept

- **What It Does**: Allows creators, animators, and analysts to play, scrub, and frame-step through a video in real-time, instantly snapping exact frames with one keystroke or click. All captured frames accumulate in a live side-panel for instant copying, individual downloading, or grid stitching.
- **Target Audience & Workflow**: Video editors, UI designers extracting reference frames, animators checking keyframes, and content curators capturing high-resolution still assets.
- **Core Value**: Replaces tedious trial-and-error slider guessing with a responsive, live video scrubbing and timeline-marking capture experience.

---

## 2. User Experience & Visual Design

### Three-Column + Bottom Timeline Layout Architecture
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Top Bar: Brand Wordmark (FrameScout) · Video Resolution/Duration · Mode Switcher       │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ [COL 1: Settings]        │ [COL 2: Video Preview & HUD]│ [COL 3: Snapshot List]        │
│ • Capture Scale (50-100%)│ • High-resolution <video>   │ • Live thumbnail count        │
│ • Image Format (PNG/JPG) │ • Center Shutter Flash FX   │ • One-click Copy / Download   │
│ • Auto-Copy on Snapped   │ • Overlay timecode & frame# │ • Stitch selected modal       │
│ • Stepping (1 / 5 frames)│ • Primary "Capture [S]" btn │ • Density toggle (Norm/Small) │
│ • Keyboard shortcut guide│ • Playback speed (0.5x-2x)  │ • Multi-select & Batch ZIP    │
├──────────────────────────┴─────────────────────────────┴───────────────────────────────┤
│ [BOTTOM: Interactive Timeline & Scrubber]                                              │
│ • Progress Bar with draggable playhead                                                 │
│ • Thumbnail tick markers at captured timestamps (click to jump to frame)               │
│ • Transport controls: [-5s] [◄ Frame] [▶ Play/Pause] [Frame ►] [+5s] · Timecode HUD   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Key User Flows
1. **Load Video & Select Mode**: User drops or selects a video and clicks the **Quick Snapshot** tab in the top navigation/mode bar.
2. **Play & Frame Scrub**: User hits `Space` or scrubs the bottom timeline. When reaching a scene of interest, user pauses and uses `Left` / `Right` arrows (or the on-screen step buttons) to navigate frame-by-frame.
3. **Capture Instant Snapshot**: User presses `S` (or clicks **Capture Snapshot**). The video viewport provides subtle visual feedback (a brief 150ms shutter flash), and the snapshot is immediately appended to the Right Panel (Column 3) with timestamp metadata.
4. **Timeline Marker Drop**: A glowing snapshot marker is placed on the timeline at that exact timestamp. Clicking the marker later jumps the video back to that frame.
5. **Manage & Export**:
   - Hover over any frame in Column 3 to **Copy to Clipboard** (`PNG`), download individually, or remove.
   - Use the **Stitch Selected** button to launch the existing custom grid stitch modal.
   - Click **Download All ZIP** or **Copy Merged Strip** from the top right actions.

### Visual Identity & Theme
- **Color Discipline (60-30-10)**:
  - `60% Neutral Canvas`: `#030304` to `#08080a` deep obsidian background ensuring high-contrast video viewports.
  - `30% Structural Surfaces`: Hairline borders (`border-gray-800`), dark graphite panels (`bg-gray-900/60`), and subtle timeline tracks.
  - `10% Accent Intent`: Indigo brand accent (`bg-indigo-600` / `text-indigo-400`) for active transport states, playhead, and primary capture triggers; emerald for "Copied!" feedback.
- **Typography & Tabular Numerals**: Strict tabular numerals (`font-mono tabular-nums`) for timecodes (`00:01:24.083`), frame counts, and duration badges.

---

## 3. Key Product Decisions & Trade-Offs

- **Dedicated Video Player Element vs Canvas Scrubbing**:
  - *Chosen Approach*: Embed an interactive HTML5 `<video>` element directly into the Center Column (Column 2) rather than rendering offscreen frames.
  - *Why*: HTML5 video gives native hardware-accelerated playback at 60fps, smooth slider scrubbing, audio preview, and variable playback speeds (0.25x to 2x). Snapshots are captured instantly to an in-memory canvas at original native resolution or user-selected scale.
- **Shared Snapshot Model with Batch Mode**:
  - *Chosen Approach*: Snapshots captured in Quick Snapshot mode conform to the existing `Screenshot` type (`id`, `url`, `blob`, `timestamp`, `fileName`).
  - *Why*: Enables seamless reuse of existing utilities: PNG clipboard copying, custom grid stitching (`StitchModal.tsx`), ZIP archiving, and thumbnail density toggling.
- **Timeline Marker Navigation**:
  - *Chosen Approach*: Render interactive marker pins on the timeline track corresponding to each captured snapshot's timestamp percentage. Hovering reveals a mini preview tooltip; clicking navigates the video directly to that timestamp.
  - *Why*: Provides high visual context and allows users to quickly inspect earlier captures without losing playback continuity.

---

## 4. Technical Architecture & Data Strategy

### Component Hierarchy & Module Layout

```
src/
├── App.tsx                     # Top bar, Mode state ('batch' | 'last-frame' | 'quick-snapshot')
├── components/
│   ├── VideoUploader.tsx       # Drag & drop video loader
│   ├── QuickSnapshotStudio/
│   │   ├── QuickSnapshotView.tsx    # 3-column parent grid + Bottom timeline container
│   │   ├── SnapshotSettingsCol.tsx  # Left Column: Scale, Format, Auto-copy, Shortcut cheat sheet
│   │   ├── VideoPreviewCol.tsx      # Center Column: HTML5 player, Shutter FX, Capture HUD
│   │   ├── SnapshotListCol.tsx      # Right Column: Live list of snapshots, batch export
│   │   └── TimelineBar.tsx          # Bottom Row: Scrubber, timestamp markers, transport buttons
│   ├── Gallery.tsx             # Used in Batch Mode
│   └── StitchModal.tsx         # Reused across all modes for custom grid stitching
└── utils/
    └── videoUtils.ts           # Shared canvas snapshot extractor & strip merger
```

### State Management & Handlers

1. **Player State** in `QuickSnapshotView`:
   - `currentTime: number`, `duration: number`, `isPlaying: boolean`, `playbackRate: number`
   - `videoRef: React.RefObject<HTMLVideoElement>`
2. **Captured Snapshots**:
   - `snapshots: Screenshot[]` (shared or mode-specific array with object URL lifecycle cleanup)
   - `selectedIds: Set<string>` for multi-selection and grid stitching
3. **Capture Handler (`handleCapture`)**:
   - Reads current video frame at `videoRef.current.currentTime`.
   - Draws video to hidden canvas matching user scale setting (50%–100%).
   - Exports blob and object URL.
   - If `autoCopy` is enabled, immediately copies the image blob to clipboard with visual toast.
   - Appends to snapshot list and places a marker on the timeline.
4. **Keyboard Event Listener**:
   - Binds to `window` with input-field protection.
   - `Space`: Toggle play/pause.
   - `S` or `C`: Trigger instant snapshot.
   - `ArrowLeft` / `ArrowRight`: Step backward / forward by 1 frame (~0.033s or calculated frame step).
   - `Shift + ArrowLeft / ArrowRight`: Seek by 5 seconds.

---

## Verification & Testing Plan

1. **Compilation Check**: Run `compile_applet` to ensure zero TypeScript or bundling errors.
2. **Mode Switching**: Verify seamless transitions between `Batch Extract`, `Last Frame`, and `Quick Snapshot`.
3. **Video Playback & Scrubbing**: Verify video loads, plays smoothly, scrubs on the bottom timeline, and updates the timecode in real-time.
4. **Capture Accuracy & Visual Feedback**: Verify clicking "Capture Snapshot" or pressing `S` captures the current frame, animates the shutter flash, and appends the frame to the right list.
5. **Timeline Marker Interactivity**: Verify markers appear on the timeline at the captured time and clicking any marker seeks the video to that moment.
6. **Export & Stitch Integration**: Verify individual copying, downloading, ZIP archiving, and opening the Stitch Modal with selected frames.
