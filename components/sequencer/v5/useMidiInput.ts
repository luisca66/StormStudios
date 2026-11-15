"use client";
/**
 * useMidiInput — conecta los teclados MIDI del navegador (Web MIDI) al estudio.
 * Solo pide permiso cuando el usuario lo enciende. Las teclas tocadas casi a
 * la vez llegan juntas como un acorde.
 */
import { useEffect, useRef, useState } from "react";
import { ChordCollector, parseMidiMessage } from "@/lib/sequencer/midi-input";

export type MidiStatus = "off" | "unsupported" | "connecting" | "waiting" | "ready" | "denied";

export function useMidiInput(enabled: boolean, onChord: (notes: number[]) => void) {
  const [state, setState] = useState<{ status: MidiStatus; device: string }>({ status: "off", device: "" });
  const handler = useRef(onChord);
  useEffect(() => { handler.current = onChord; });
  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.requestMIDIAccess) { queueMicrotask(() => setState({ status: "unsupported", device: "" })); return; }
    let cancelled = false, access: MIDIAccess | null = null;
    const collector = new ChordCollector(notes => handler.current(notes));
    const onMessage = (event: MIDIMessageEvent) => { const message = event.data && parseMidiMessage(event.data); if (message?.type === "on") collector.press(message.note); };
    const attach = () => {
      if (!access || cancelled) return;
      const names: string[] = [];
      access.inputs.forEach(input => { input.onmidimessage = onMessage; if (input.state !== "disconnected") names.push(input.name ?? "MIDI"); });
      setState({ status: names.length ? "ready" : "waiting", device: names.join(", ") });
    };
    queueMicrotask(() => { if (!cancelled) setState({ status: "connecting", device: "" }); });
    navigator.requestMIDIAccess().then(granted => { if (cancelled) return; access = granted; access.onstatechange = attach; attach(); })
      .catch(() => { if (!cancelled) setState({ status: "denied", device: "" }); });
    return () => {
      cancelled = true; collector.dispose();
      if (access) { access.onstatechange = null; access.inputs.forEach(input => { input.onmidimessage = null; }); }
      setState({ status: "off", device: "" });
    };
  }, [enabled]);
  return state;
}
