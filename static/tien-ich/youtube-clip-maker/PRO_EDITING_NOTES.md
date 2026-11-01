# YouTube Clip Maker Lab — Pro editing extension (2026-11-01)

This static, local-first implementation is an independent web editor inspired by professional video-editing workflows, not CapCut or an implementation of CapCut's subscription features.

## Implemented in this change

- Select any imported MP4/WebM video in the asset panel and click **♫ Tách** to create a detached, independently controlled audio lane. The source video remains muted by the existing editor; there is no second copy of audio in the export.
- The detached audio element uses the original local object URL. Its timeline is synchronized with transport play/pause/seek and MediaRecorder render. Multiple detached clips can coexist.
- Control clip audio In, Out, timeline offset, track gain, Fade In / Fade Out, Mute, Solo. Media file bytes remain unchanged. Audio mixes into the existing Web Audio MediaStreamDestination.
- Export selected audio's original PCM content to 16-bit WAV, respecting In/Out, without uploading. This WAV does not bake in preview gain/fades/offset/solo; those effects apply to full video renders only. Large clips and unsupported source codecs produce actionable errors.
- Check Video Only to omit all audio tracks from MP4/WebM canvas render; separately export WAV for two independent deliverables.
- Color grade using additional brightness, contrast and saturation controls in the inspector.
- Import/edit/export SRT subtitles with precise timestamps. Existing script-based auto captions remain a word-count time estimate, not speech recognition. Imported timecodes persist when media duration changes; new script generation intentionally replaces them.
- Optional secondary panels use collapsed-by-default native details/summary controls. No API token, server or third-party CDN is required.

## Manual browser acceptance tests (Chrome / Edge; Safari as compatibility check)

1. Import a video containing audible speech and press ♫ Tách. Confirm a separate green audio lane appears and the inspector opens. The original clip should remain visually available.
2. Play from 0, scrub inside/outside the visual clip's slot, pause, resume, seek backward. Confirm no doubled playback and no audible leaks outside the selected audio range.
3. Change In/Out and gain, add Fade In/Out; check that solo and mute behave predictably with two or more detached clips.
4. Add voiceover and BGM, export normal mixed video; listen through the rendered file to confirm all enabled audio. Then check Video Only, export again and confirm the video has no audio stream.
5. Download WAV from the selected track. Validate that its duration matches trimmed In/Out and that original recording samples are used, rather than an AI vocal/music separation.
6. Import a multiline SRT timecode, e.g. 00:00:01,200 --> 00:00:03,500. Confirm exact preview position and exported video captions. Edit text/times, apply and export SRT; test invalid block rejection.
7. Change aspect 16:9 ↔ 9:16, switch 720/1080, adjust brightness/contrast/saturation, preview and render.
8. Remove an asset with detached audio; confirm the detached track disappears, its media element stops and ObjectURL is eventually revoked. Reload page: no background uploads or token requests.
9. On an unsupported codec, empty-audio clip or memory-limited device, confirm clear error and ability to continue editing.

## Current constraints / next stages

- This is audio/video stream detachment, not separation of singer/vocals/instruments. AI vocal isolation, background removal, auto captions, motion tracking, stabilization, chroma key and premium templates are not claimed here.
- WAV decoding must be supported by the browser; source limit 200 MB and generated WAV limit 150 MB. Export of full video is real-time canvas capture and is codec/browser-dependent.
- Visual clips are still apportioned in equal timeline slots in the original editor; true multi-layer compositing, ripple editing, arbitrary video cuts, keyframes, optical flow, and background processing should be scoped as later architectural changes.
- The browser media handling approach is consistent with [MDN Web Audio](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_manipulation) and [CapCut's documented extraction workflow](https://www.capcut.com/resource/extract-audio-from-video). The current features are not presented as a full CapCut Pro clone.
