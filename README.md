# CallBook teaser

The delivered video is [artifacts/video.mp4](artifacts/video.mp4). It is a 10-second, silent, three-scene teaser for CallBook.

| Property | Delivered value |
| --- | --- |
| Container | MP4, fast-start (`moov` before `mdat`) |
| Video | H.264 High, `yuv420p`, 1280 × 720, 24 fps, 240 frames |
| Duration | 10.00 seconds |
| Audio | AAC-LC, 48 kHz stereo, encoded from a silent source; no speech or music |
| Size | 1,104,177 bytes |

The seal shot runs from 0–3.33 seconds, the price chart from 3.33–6.67 seconds, and the ledger from 6.67–10 seconds. The mint check uses `#3fcf7f`. The final on-screen copy reads exactly `CALLBOOK` and `Calls you can't delete.` The title is fully visible throughout the last second.

The desk and ledger shots use image-generated JPEG plates, then subtle zooms and short transitions between edited still frames. Their hand press and book close are stylized motion rather than continuous live-action footage. The chart, check, title, and timing are deterministic local graphics. Image prompts are in [assets/IMAGE_PROMPTS.md](assets/IMAGE_PROMPTS.md).

To rebuild, run `./render.sh` with FFmpeg and Node.js available locally; set `FFMPEG_BIN` to the FFmpeg executable path when needed. FFmpeg needs H.264 encoding, AAC encoding, and the `drawtext` and `zoompan` filters. The repository includes the scene plates and fonts used by the renderer, and the chart graphics require no Node.js packages. The delivered MP4 needs no build dependency to play.

Local validation used FFmpeg to decode all 240 frames through 10.00 seconds and confirmed H.264 video, AAC audio, 1280 × 720 dimensions, 24 fps, and an AAC track encoded from digital silence. A container box check found `ftyp`, then `moov`, then `mdat`. Sample frames from all three scenes, including the final frame, were visually inspected. AAC encoding produces a negligible measured noise floor near −91 dB.
