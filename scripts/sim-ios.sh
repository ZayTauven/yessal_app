#!/usr/bin/env bash
# Cloud iOS Simulator session (EAS Simulator) with spending guards.
#
#   scripts/sim-ios.sh metro                 Metro + tunnel, API = demo VPS (terminal 1)
#   scripts/sim-ios.sh start [minutes] [url] Session on the latest ios-simulator build (terminal 2)
#   scripts/sim-ios.sh status                Running sessions and minutes used this month
#   scripts/sim-ios.sh stop                  Stop every running session
#
# Guards: a session never starts if the free monthly minutes left are fewer
# than the requested duration, and it always carries --max-duration-minutes,
# so it stops on its own even if this terminal is closed.
set -euo pipefail
cd "$(dirname "$0")/.."

ACCOUNT="zayad444"
API_URL="https://api-yessal.kasigroupe.tech/api"
DEFAULT_MINUTES=20
SCHEME="yessalgui"

eas_json() { eas "$@" --json --non-interactive 2>/dev/null; }

minutes_left() {
  eas_json account:usage "$ACCOUNT" | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      const m = JSON.parse(s.slice(s.indexOf("{"))).simulator.minutes.plan;
      console.log(Math.floor(m.limit - m.used));
    });'
}

running_sessions() {
  # Queued and starting sessions count too: stopping only in-progress ones
  # would leave a session that starts billing a minute later.
  eas_json simulator:list --status new --status queued --status starting --status in-progress | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      const i = s.search(/[\[{]/); if (i < 0) return;
      const j = JSON.parse(s.slice(i));
      const list = Array.isArray(j) ? j : (j.sessions || j.items || []);
      for (const x of list) console.log(x.id);
    });'
}

case "${1:-}" in
  metro)
    echo "API used by the app: $API_URL"
    echo "Keep this terminal open. Stop Metro (Ctrl+C) when you are done: the tunnel URL is public."
    EXPO_PUBLIC_API_URL="$API_URL" npx expo start --dev-client --tunnel
    ;;

  start)
    minutes="${2:-$DEFAULT_MINUTES}"
    metro_url="${3:-}"
    left="$(minutes_left)"
    echo "Free simulator minutes left this month: $left"
    if (( minutes > left )); then
      echo "Refused: $minutes min requested, only $left left. Ask for less, or wait for the 1st of the month." >&2
      exit 1
    fi
    if [[ -n "$(running_sessions)" ]]; then
      echo "Refused: a session is already running. Run 'scripts/sim-ios.sh stop' first." >&2
      exit 1
    fi
    build_id="$(eas_json build:list --platform ios --simulator --status finished --limit 1 \
      | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s.slice(s.indexOf("[")))[0].id))')"
    args=(--platform ios --type web-preview-only --build-id "$build_id"
          --max-duration-minutes "$minutes" --name "Yessal debug iOS"
          --launch-arg "-EXDevMenuIsOnboardingFinished" --launch-arg "1"
          --launch-arg "-EXDevMenuShowsAtLaunch" --launch-arg "0"
          --non-interactive)
    if [[ -n "$metro_url" ]]; then
      encoded="$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$metro_url")"
      args+=(--open-url "$SCHEME://expo-development-client/?url=$encoded")
    fi
    echo "Build $build_id, session capped at $minutes min."
    eas simulator:start "${args[@]}"
    echo
    echo "The session stops by itself after $minutes min. To stop it sooner: scripts/sim-ios.sh stop"
    ;;

  status)
    echo "Free simulator minutes left this month: $(minutes_left)"
    eas simulator:list --status queued --status starting --status in-progress --non-interactive 2>/dev/null || true
    ;;

  stop)
    ids="$(running_sessions)"
    if [[ -z "$ids" ]]; then echo "No running session."; exit 0; fi
    for id in $ids; do eas simulator:stop --id "$id" --non-interactive; done
    ;;

  *)
    sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
