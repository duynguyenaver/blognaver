/* BlogNaver Clip Maker — non-destructive embedded audio tracks.
 * Uses browser MediaElements and Web Audio; no uploads, external APIs or CDNs.
 */
(() => {
  "use strict";
  const core = window.BNClipMakerCore;
  if (!core) return;
  const $ = id => document.getElementById(id);
  const ui = {
    panel: $("proAudioTools"), selected: $("selectedVideoName"), detach: $("detachEmbeddedAudio"),
    saveWav: $("saveDetachedWav"), remove: $("removeDetachedAudio"), status: $("proAudioStatus"),
    offset: $("audioOffset"), start: $("audioTrimStart"), end: $("audioTrimEnd"),
    gain: $("audioGain"), fadeIn: $("audioFadeIn"), fadeOut: $("audioFadeOut"),
    mute: $("audioMute"), solo: $("audioSolo"), track: $("detachedTrack"), silent: $("silentExport")
  };
  if (!ui.panel || !ui.track) return;
  const tracks = new Map();
  let selectedId = null, context = null, destination = null, locked = false;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const number = (el, fallback = 0) => Number.isFinite(Number(el.value)) ? Number(el.value) : fallback;
  const say = (message, error = false) => {
    ui.status.textContent = message;
    ui.status.classList.toggle("error", error);
  };
  function findSelected() { return core.getAssets().find(item => item.id === selectedId); }
  function getTrack() { return tracks.get(selectedId); }
  function trackRange(track) {
    const items = core.getAssets(), index = items.indexOf(track.asset), { duration } = core.getTimeline();
    if (index < 0 || !items.length) return null;
    const slot = duration / items.length;
    const start = index * slot + track.offset;
    const length = Math.min(slot, Math.max(0, track.end - track.start));
    return { start, end: start + length, length };
  }
  function wire(track) {
    if (!context || !destination || track.source) return;
    track.source = context.createMediaElementSource(track.element);
    track.node = context.createGain();
    track.source.connect(track.node);
    track.node.connect(destination);
    track.node.connect(context.destination);
    track.node.gain.value = 0;
  }
  function connect(ctx, dest) {
    context = ctx; destination = dest;
    for (const track of tracks.values()) wire(track);
  }
  function updateRangeFields(track) {
    ui.start.max = Math.max(0, track.asset.duration).toFixed(2);
    ui.end.max = Math.max(0, track.asset.duration).toFixed(2);
    ui.start.value = String(track.start);
    ui.end.value = String(track.end);
    ui.offset.value = String(track.offset);
    ui.gain.value = String(track.volume);
    ui.fadeIn.value = String(track.fadeIn);
    ui.fadeOut.value = String(track.fadeOut);
    ui.mute.checked = track.muted;
    ui.solo.checked = track.solo;
  }
  function renderInspector() {
    const asset = findSelected(), track = getTrack();
    ui.selected.textContent = asset ? asset.name + " · " + core.fmt(asset.duration || 0) : "Chọn một video trong Media Library";
    ui.detach.disabled = locked || !asset || asset.type !== "video" || !!track;
    ui.saveWav.disabled = locked || !track;
    ui.remove.disabled = locked || !track;
    for (const el of [ui.offset, ui.start, ui.end, ui.gain, ui.fadeIn, ui.fadeOut, ui.mute, ui.solo]) {
      el.disabled = locked || !track;
    }
    if (track) updateRangeFields(track);
  }
  function renderTimeline() {
    ui.track.replaceChildren();
    const ordered = core.getAssets().filter(asset => tracks.has(asset.id));
    if (!ordered.length) {
      const empty = document.createElement("span");
      empty.className = "placeholder";
      empty.textContent = "Chọn video → Tách Audio để tạo track âm thanh độc lập.";
      ui.track.append(empty);
      return;
    }
    const { duration } = core.getTimeline();
    for (const asset of ordered) {
      const track = tracks.get(asset.id), range = trackRange(track);
      const row = document.createElement("div");
      row.className = "detached-audio-row" + (track.id === selectedId ? " selected" : "");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "detached-audio-label";
      button.disabled = locked;
      button.title = "Chọn audio track và đến điểm bắt đầu";
      button.textContent = "♫ " + asset.name;
      button.onclick = () => {
        selectedId = asset.id;
        renderInspector(); renderTimeline();
        if (range) core.seek(clamp(range.start, 0, duration));
        ui.panel.open = true;
      };
      const space = document.createElement("div");
      space.className = "detached-audio-space";
      const bar = document.createElement("div");
      bar.className = "detached-audio-bar";
      bar.style.left = clamp(range.start / duration * 100, 0, 100) + "%";
      bar.style.width = clamp(range.length / duration * 100, 0, 100) + "%";
      bar.title = "Bắt đầu " + core.fmt(Math.max(0, range.start)) + " · " + range.length.toFixed(1) + " giây";
      bar.textContent = (track.muted ? "TẮT TIẾNG · " : track.solo ? "SOLO · " : "") +
        "Volume " + Math.round(track.volume * 100) + "%";
      space.append(bar); row.append(button, space); ui.track.append(row);
    }
  }
  function onAssetsChanged() {
    if (selectedId && !findSelected()) selectedId = null;
    renderInspector(); renderTimeline();
  }
  function selectAsset(asset) {
    if (locked || asset.type !== "video") return;
    selectedId = asset.id; renderInspector(); renderTimeline(); ui.panel.open = true;
    say("Đã chọn " + asset.name + ". Bấm Tách Audio để tạo track độc lập.");
  }
  function decorateAssetCard(card, asset) {
    if (asset.type !== "video") return;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = tracks.has(asset.id) ? "♫ Đã tách" : "♫ Tách";
    button.title = "Chọn clip để tách và chỉnh sửa tiếng gốc";
    button.disabled = locked;
    button.onclick = () => { selectAsset(asset); if (!tracks.has(asset.id)) detachAudio(); };
    card.querySelector(".order")?.append(button);
    card.addEventListener("click", event => {
      if (event.target.closest("button")) return;
      selectAsset(asset);
    });
    card.classList.toggle("audio-selected", asset.id === selectedId);
  }
  function detachAudio() {
    const asset = findSelected();
    if (locked || !asset || asset.type !== "video" || tracks.has(asset.id)) return;
    const el = document.createElement("audio");
    el.preload = "auto";
    el.src = asset.url; // Same local object URL; native video display remains muted.
    const track = {
      id: asset.id, asset, element: el, source: null, node: null,
      start: 0, end: asset.duration || 0, offset: 0, volume: 1,
      fadeIn: 0, fadeOut: 0, muted: false, solo: false
    };
    tracks.set(asset.id, track);
    try { wire(track); }
    catch (error) { tracks.delete(asset.id); say("Không mở được track: " + error.message, true); return; }
    onAssetsChanged();
    core.renderAssets();
    core.refreshTimeline();
    say("Đã tách tiếng gốc thành track riêng. Có thể cắt, dịch thời gian, solo, mute và tải WAV.");
  }
  function destroyTrack(id) {
    const track = tracks.get(id);
    if (!track) return;
    track.element.pause();
    track.source?.disconnect(); track.node?.disconnect();
    track.element.removeAttribute("src"); track.element.load();
    tracks.delete(id);
  }
  function removeTrack() {
    if (locked || !getTrack()) return;
    destroyTrack(selectedId); onAssetsChanged(); core.renderAssets();
    say("Đã xóa track audio tách riêng; video gốc vẫn giữ nguyên.");
  }
  function onRemoveAsset(asset) {
    destroyTrack(asset.id);
    if (selectedId === asset.id) selectedId = null;
    onAssetsChanged();
  }
  function sync(t, isPlaying) {
    const solos = [...tracks.values()].some(x => x.solo);
    for (const track of tracks.values()) {
      const range = trackRange(track), el = track.element;
      if (!range || !range.length || t < Math.max(0, range.start) || t >= range.end) {
        if (!el.paused) el.pause();
        if (track.node) track.node.gain.value = 0;
        continue;
      }
      const elapsed = t - range.start;
      const target = clamp(track.start + elapsed, 0, Math.max(0, track.asset.duration - .02));
      if (el.readyState >= 1 && Math.abs(el.currentTime - target) > .22) {
        try { el.currentTime = target; } catch (_) {}
      }
      if (track.node && context) {
        const fadeIn = track.fadeIn > 0 ? clamp(elapsed / track.fadeIn, 0, 1) : 1;
        const fadeOut = track.fadeOut > 0 ? clamp((range.length - elapsed) / track.fadeOut, 0, 1) : 1;
        const volume = track.muted || (solos && !track.solo) ? 0 : track.volume * fadeIn * fadeOut;
        track.node.gain.setTargetAtTime(volume, context.currentTime, .012);
      }
      if (isPlaying) { if (el.paused) el.play().catch(() => {}); }
      else if (!el.paused) el.pause();
    }
  }
  function stop() { for (const track of tracks.values()) track.element.pause(); }
  function setLock(value) { locked = value; renderInspector(); renderTimeline(); }
  function updateTrack() {
    const track = getTrack();
    if (!track || locked) return;
    const max = track.asset.duration || 0;
    const start = clamp(number(ui.start), 0, max);
    const end = clamp(number(ui.end), start + .05, max);
    if (end - start < .05) {
      say("Đoạn audio phải dài ít nhất 0,05 giây.", true);
      renderInspector(); return;
    }
    track.start = start; track.end = end;
    track.offset = clamp(number(ui.offset), -300, 300);
    track.volume = clamp(number(ui.gain, 1), 0, 2);
    track.fadeIn = clamp(number(ui.fadeIn), 0, end - start);
    track.fadeOut = clamp(number(ui.fadeOut), 0, end - start);
    track.muted = ui.mute.checked; track.solo = ui.solo.checked;
    renderTimeline();
    sync(core.getTimeline().position, core.getTimeline().playing);
  }
  const writeASCII = (view, index, string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(index + i, string.charCodeAt(i));
  };
  async function saveWav() {
    const track = getTrack();
    if (!track || locked) return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) { say("Trình duyệt không hỗ trợ giải mã Web Audio.", true); return; }
    locked = true; renderInspector();
    let decoder;
    try {
      if (track.asset.blob.size > 200 * 1024 * 1024) throw Error("File gốc quá lớn để giải mã an toàn trên trình duyệt.");
      say("Đang giải mã tiếng gốc... (chưa upload dữ liệu)");
      decoder = new Context();
      const buffer = await decoder.decodeAudioData(await track.asset.blob.arrayBuffer());
      const channels = Math.min(buffer.numberOfChannels, 2);
      const begin = clamp(Math.floor(track.start * buffer.sampleRate), 0, buffer.length);
      const finish = clamp(Math.ceil(track.end * buffer.sampleRate), begin, buffer.length);
      const frames = finish - begin;
      const bytes = 44 + frames * channels * 2;
      if (!frames) throw Error("Đoạn chọn không chứa mẫu âm thanh.");
      if (bytes > 150 * 1024 * 1024) throw Error("WAV quá 150 MB. Hãy giảm điểm Out hoặc dùng clip ngắn hơn.");
      const result = new ArrayBuffer(bytes), view = new DataView(result);
      writeASCII(view, 0, "RIFF"); view.setUint32(4, bytes - 8, true);
      writeASCII(view, 8, "WAVEfmt "); view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); view.setUint16(22, channels, true);
      view.setUint32(24, buffer.sampleRate, true);
      view.setUint32(28, buffer.sampleRate * channels * 2, true);
      view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true);
      writeASCII(view, 36, "data"); view.setUint32(40, bytes - 44, true);
      const samples = Array.from({ length: channels }, (_, i) => buffer.getChannelData(i));
      for (let at = 0; at < frames; at += 65536) {
        const end = Math.min(frames, at + 65536);
        for (let i = at; i < end; i++) {
          for (let ch = 0; ch < channels; ch++) {
            const value = clamp(samples[ch][begin + i], -1, 1);
            view.setInt16(44 + (i * channels + ch) * 2,
              value < 0 ? Math.round(value * 32768) : Math.round(value * 32767), true);
          }
        }
        say("Đang xuất WAV: " + Math.round(end / frames * 100) + "%");
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      const url = URL.createObjectURL(new Blob([result], { type: "audio/wav" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = track.asset.name.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}_.-]+/gu, "-") + "-audio.wav";
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      say("Đã tạo WAV từ tiếng gốc (" + (bytes / 1048576).toFixed(1) + " MB). File được lưu trên thiết bị.");
    } catch (error) {
      say("Không thể xuất WAV: " + error.message + ". Hãy thử MP4 H.264/AAC hoặc WebM/Opus tương thích.", true);
    } finally {
      if (decoder) await decoder.close().catch(() => {});
      locked = false; renderInspector();
    }
  }
  for (const id of ["offset", "start", "end", "gain", "fadeIn", "fadeOut", "mute", "solo"]) {
    const element = ui[id === "offset" ? "offset" : id === "start" ? "start" : id === "end" ? "end" : id];
    element.addEventListener("change", updateTrack);
    if (["gain", "mute", "solo"].includes(id)) element.addEventListener("input", updateTrack);
  }
  ui.detach.addEventListener("click", detachAudio);
  ui.remove.addEventListener("click", removeTrack);
  ui.saveWav.addEventListener("click", saveWav);
  window.BNClipMakerPro = Object.freeze({
    hasAudio: () => tracks.size > 0,
    connect, sync, stop, setLock, onAssetsChanged, onRemoveAsset, decorateAssetCard,
    isSilentExport: () => ui.silent.checked
  });
  onAssetsChanged();
  say("Chọn một video trong Media Library để tách âm thanh và xuất WAV.");
})();
