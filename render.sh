#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

work_dir="$(mktemp -d /tmp/callbook-render.XXXXXX)"
trap 'rm -rf "$work_dir"' EXIT
ffmpeg="${FFMPEG_BIN:-ffmpeg}"
if ! command -v "$ffmpeg" >/dev/null 2>&1; then
  echo "FFmpeg is required to rebuild artifacts/video.mp4; set FFMPEG_BIN to its executable path." >&2
  exit 1
fi

"$ffmpeg" -hide_banner -loglevel error -y \
  -loop 1 -framerate 24 -i assets/seal-hover.jpg \
  -loop 1 -framerate 24 -i assets/seal-press.jpg \
  -filter_complex_script filters/scene1.fffilter -map '[v]' -frames:v 80 \
  -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p "$work_dir/seal.mp4"

node render_chart.js "$ffmpeg" "$work_dir/chart.mp4"

"$ffmpeg" -hide_banner -loglevel error -y \
  -loop 1 -framerate 24 -i assets/ledger-closing.jpg \
  -loop 1 -framerate 24 -i assets/ledger-closed.jpg \
  -f lavfi -i 'color=c=black@0.0:s=650x200:r=24,format=rgba' \
  -filter_complex_script filters/scene3.fffilter -map '[v]' -frames:v 80 \
  -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p "$work_dir/ledger.mp4"

mkdir -p artifacts
"$ffmpeg" -hide_banner -loglevel error -y \
  -i "$work_dir/seal.mp4" -i "$work_dir/chart.mp4" -i "$work_dir/ledger.mp4" \
  -f lavfi -i 'anullsrc=channel_layout=stereo:sample_rate=48000' \
  -filter_complex '[0:v]setpts=PTS-STARTPTS[v0];[1:v]fade=t=in:st=0:d=0.10,fade=t=out:st=3.20:d=0.13,setpts=PTS-STARTPTS[v1];[2:v]setpts=PTS-STARTPTS[v2];[v0][v1][v2]concat=n=3:v=1:a=0,trim=duration=10,format=yuv420p[v];[3:a]atrim=duration=10,asetpts=PTS-STARTPTS[a]' \
  -map '[v]' -map '[a]' -r 24 -frames:v 240 -t 10 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 96k -ar 48000 -ac 2 -movflags +faststart \
  artifacts/video.mp4
