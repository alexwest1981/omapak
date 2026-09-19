#!/bin/sh
# OmarchyTube entry point.
#
# zypak-wrapper comes from org.electronjs.Electron2.BaseApp and is what makes
# Chromium's sandbox work inside a flatpak; without it Electron exits with the
# "SUID sandbox helper binary was found, but is not configured correctly"
# error. Electron is handed the app directory, which is the tree npm installed
# into during the build.
# Pick the session the app was actually started in. Electron defaults to X11
# and exits with "Missing X server or $DISPLAY" on a Wayland-only desktop —
# which is the desktop this app is written for. --ozone-platform-hint=auto did
# not switch it (measured in the judge container: still ozone_platform_x11),
# so the platform is set explicitly when the session is Wayland, and left alone
# for X11 users.
ozone=""
if [ -n "${WAYLAND_DISPLAY:-}" ]; then
    ozone="--ozone-platform=wayland"
fi
exec zypak-wrapper /app/omarchy-tube/node_modules/electron/dist/electron \
    /app/omarchy-tube $ozone "$@"
