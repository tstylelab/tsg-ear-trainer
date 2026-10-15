# Piano sample credits

Salamander Grand Piano — Yamaha C5, recorded by **Alexander Holm**.

- Distribution used: https://github.com/Tonejs/audio/tree/master/salamander
- Original license notice: https://github.com/Tonejs/audio/blob/master/salamander/README
- License: [Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/)
- Downloaded 2026-10-15 from https://tonejs.github.io/audio/salamander/

TSG Ear Trainer embeds 17 stereo MP3 samples, C2–C6 at minor-third intervals.
Changes: trimmed to 4.2 seconds, last 150 ms faded, re-encoded with LAME VBR quality 3.
At playback, the nearest sample is repitched by at most one semitone in the exercise range;
gain and note-release envelopes are applied. No endorsement by the original author is implied.
The original recordings' license applies to the embedded piano samples.

Rebuild with `_tools/build-piano.py`; source and embedded SHA-256 hashes are in
`_tools/piano-manifest.json`. The samples remain embedded in the application for offline use.
