#!/usr/bin/env bash
# loop/v8/scripts/deploy-to-kaaos-daemon.sh
# One-shot deploy of V8 infra to kaaos-daemon AFTER the PR has merged to main.
# Run from the Mac (NOT from the daemon).
#
# Usage:
#   bash loop/v8/scripts/deploy-to-kaaos-daemon.sh        # full sequence: pull → chmod → mkdir log → dry-run → cron install
#   bash loop/v8/scripts/deploy-to-kaaos-daemon.sh wet    # full sequence + touch wet-run-enabled + manual trigger
#
# Pre-reqs:
# - gcloud is authenticated and configured
# - PR #10 (or successor) merged to roham/topshot-data-portal main
# - kaaos-daemon already has the repo cloned at /home/r_dapperlabs_com/topshot-builder/topshot-data-portal/
# - V7 cron line on the VM is commented with [V7-DISABLE 2026-05-18] marker

set -uo pipefail

WET="${1:-dry}"
DAEMON_PATH="/home/r_dapperlabs_com/topshot-builder/topshot-data-portal"
PROJECT="dl-kaaos"
ZONE="us-central1-a"
INSTANCE="kaaos-daemon"

ssh_run() {
  gcloud compute ssh --tunnel-through-iap "$INSTANCE" \
    --project "$PROJECT" --zone "$ZONE" \
    --command "$1"
}

ssh_sudo() {
  ssh_run "sudo -u r_dapperlabs_com bash -lc $(printf '%q' "$1")"
}

echo "=== [1/7] git pull --rebase --autostash on kaaos-daemon ==="
ssh_sudo "cd $DAEMON_PATH && git pull --rebase --autostash"

echo "=== [2/7] chmod +x loop/v8/scripts ==="
ssh_sudo "cd $DAEMON_PATH && chmod +x loop/v8/scripts/*.sh loop/v8/scripts/*.mjs && ls -la loop/v8/scripts/"

echo "=== [3/7] mkdir /var/log/topshot-loop ==="
ssh_run "sudo mkdir -p /var/log/topshot-loop && sudo chown r_dapperlabs_com:r_dapperlabs_com /var/log/topshot-loop && ls -ld /var/log/topshot-loop"

echo "=== [4/7] sanity: refresh-secrets exports ANTHROPIC_API_KEY + OPENAI_API_KEY ==="
ssh_sudo "cd $DAEMON_PATH && ls .env* 2>/dev/null || true; env | grep -E '^(ANTHROPIC_API_KEY|OPENAI_API_KEY)=' >/dev/null && echo keys-in-env || echo keys-NOT-in-env-shell-only-likely-fine-cron-runs-with-its-own-env"

echo "=== [5/7] DRY-RUN cron-tick.sh (no API calls beyond pre-flight) ==="
ssh_sudo "cd $DAEMON_PATH && DRY_RUN=1 bash -x ./loop/v8/scripts/cron-tick.sh 2>&1 | head -50" || true

echo "=== [6/7] install cron line above V7-DISABLE marker ==="
CRON_LINE="*/30 * * * * cd $DAEMON_PATH && ./loop/v8/scripts/cron-tick.sh >> /var/log/topshot-loop/v8.log 2>&1"
ssh_sudo "
  set -e
  CUR=\$(crontab -l 2>/dev/null || true)
  if printf '%s' \"\$CUR\" | grep -q 'cron-tick.sh'; then
    echo 'v8 cron already installed; not duplicating'
  else
    NEW=\$(printf '%s\n%s\n' \"$CRON_LINE\" \"\$CUR\")
    printf '%s\n' \"\$NEW\" | crontab -
    echo 'v8 cron installed'
  fi
  crontab -l | grep -E 'cron-tick|V7-DISABLE' || true
"

if [[ "$WET" == "wet" ]]; then
  echo "=== [7/7] WET-RUN: touch wet-run-enabled + manual trigger ==="
  ssh_sudo "cd $DAEMON_PATH && touch loop/v8/state/wet-run-enabled && ls -la loop/v8/state/wet-run-enabled"
  ssh_sudo "cd $DAEMON_PATH && ./loop/v8/scripts/cron-tick.sh 2>&1 | tee -a /var/log/topshot-loop/v8.log | tail -50"
  echo "Wet-run kicked off. Tail logs with:"
  echo "  gcloud compute ssh --tunnel-through-iap $INSTANCE --project $PROJECT --zone $ZONE --command 'sudo -u r_dapperlabs_com tail -f /var/log/topshot-loop/v8.log'"
else
  echo "=== [7/7] DRY mode complete. To wet-run, re-invoke as: bash $0 wet ==="
  echo "Cron will tick every 30 min but exits early without wet-run-enabled marker."
fi
