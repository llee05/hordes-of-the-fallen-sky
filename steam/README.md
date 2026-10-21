# Steam build preparation

The Last Blue Sky runs as an offline desktop executable. This folder describes the Steam side; it does not upload or publish anything.

## Build and stage content

Run `npm run package:win` and/or `npm run package:linux`. The generated `release/TheLastBlueSky-<platform>-x64/` folder is the complete content for that platform's depot. It includes the executable, runtime libraries, locales, and `resources/app.asar`. Upload the whole folder, not an installer and not only the executable.

Create an application and OS-specific depots in Steamworks. Use the IDs assigned to your application; this project does not assume Spacewar's test ID. Set each depot's OS restriction and make sure your developer package includes it. Configure launch options:

| Platform    | Executable relative to depot root | Working directory |
| ----------- | --------------------------------- | ----------------- |
| Windows x64 | `TheLastBlueSky.exe`              | `.`               |
| Linux x64   | `TheLastBlueSky`                  | `.`               |

Build and test the target platform before marking it supported on your store page. The Linux package must retain executable permissions. The project makes no Steam Deck verification claim.

## Generate SteamPipe files

After packaging, provide your real App ID and whichever depot IDs you are preparing:

```sh
STEAM_APP_ID=YOUR_APP_ID \
STEAM_WINDOWS_DEPOT_ID=YOUR_WINDOWS_DEPOT_ID \
STEAM_LINUX_DEPOT_ID=YOUR_LINUX_DEPOT_ID \
npm run steam:prepare
```

Replace the placeholder values with numeric IDs. Omit a platform's environment variable when it is not part of this build. On PowerShell, set the corresponding `$env:STEAM_APP_ID` and depot variables before running the npm command.

This writes `steam/generated/app_build.vdf` and referenced depot VDFs using absolute content paths, after validating that the packaged executables exist. Output files are ignored by git. The app script defaults to `"Preview" "1"` and has no `SetLive` branch. SteamPipe preview builds generate manifests/logs without uploading game content. See Valve's [uploading documentation](https://partner.steamgames.com/doc/sdk/uploading).

With your Steamworks build account and SteamCMD/SDK installed, you can run the generated script through SteamCMD. Keep passwords and Steam Guard tokens out of source and command history. Inspect the preview manifests, then change Preview to `0` when you intend to upload. Test an uploaded build on a private branch before releasing it. The preparation script never invokes SteamCMD.

## Saves and Auto-Cloud

To preserve existing profiles, the game retains its internal `Gloam/saves/profile.json` save path beneath the OS application-data directory. Keep Chromium caches and other Electron user-data files out of cloud synchronization.

For an initial Auto-Cloud configuration, use a Windows `WinAppDataRoaming` root with subdirectory `Gloam/saves`, pattern `profile.json`, non-recursive, and cross-platform OS restriction. Configure root overrides for macOS `MacAppSupport` with `Gloam/saves`, and Linux `LinuxHome` with `.config/Gloam/saves`, using replacement paths as needed. For a customized Linux `XDG_CONFIG_HOME`, adjust the rule or adopt a fixed cloud-save location before release. See Valve's [Auto-Cloud configuration guide](https://partner.steamgames.com/doc/features/cloud).

The current profile is per OS user, rather than per Steam account. Before release, decide how saves should behave when several Steam accounts share a machine; SteamID-scoped profiles require actual Steamworks user identity. Cloud behavior must be tested with the real App ID across machines. The generator does not enable Steam Cloud in the partner portal.

## Steamworks integration

The desktop bridge is intentionally small: profile load/save, native fullscreen, and quit. Steam achievements, stats, ownership checks, overlay activation, and Steam Input action manifests are not connected yet. Select and test a Steamworks binding against the pinned Electron runtime before adding these APIs to the main process and exposing narrow operations through the preload. Keep renderer Node integration disabled.

Regular controllers already work through the standard Gamepad mapping. Steam Input can emulate that mapping; configure and test the appropriate controller layout in Steamworks. This does not replace physical controller and Steam Deck testing.

## Before shipping

Finish the actual game content and balancing, validate Windows/Linux builds on target hardware, test Steam launch/exit/update/cloud behavior, add and verify any Steamworks features, and prepare store/library art and review materials. macOS additionally needs its own build validation, release icon, signing/notarization decisions, and appropriate Steam overlay entitlements if supported. These packages are a distribution foundation, rather than a completed commercial release.
