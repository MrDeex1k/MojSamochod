# Application icons

The car silhouette follows the visual family of the MojeZegarki icon: deep teal,
cream and a small orange accent. No lettering or vehicle manufacturer logo is used.

## Platform assets

- `Car.icon`: editable Apple Icon Composer document with separate silhouette,
  detail and accent SVG layers. Light and dark appearances are defined explicitly;
  Apple renders the glass, clear and tinted appearances.
- `icon-light.png` and `icon-dark.png`: flat, full-square 1024px artwork. The dark
  image is the Expo fallback icon.
- `android-foreground.png`: transparent adaptive foreground with additional safe
  space. Android uses only the dark teal background (`#07383D`), with no separate
  light or monochrome asset. Launcher-level customization remains outside the app's
  control.
- `previews/`: native Icon Composer renderer output for design generations 26 and
  27, covering Default, Dark, ClearLight, ClearDark, TintedLight and TintedDark.
  These are design previews, not screenshots from physical devices.

Expo configuration in `../../app.json` references the platform assets. Changing
launcher icons requires a new native build; Expo Go cannot verify this integration.
The icon change does not rename the application or change its bundle identifier.

## Regeneration

From the repository root on macOS:

```sh
swift scripts/generate-app-icons.swift
```

The script regenerates the SVG layers and flat PNG files, but preserves the
appearance and material settings in `Car.icon/icon.json`. Keep source geometry in
the script rather than manually editing generated SVG files.

Open `Car.icon` in Icon Composer to adjust materials. With Xcode 27 selected,
render a preview using the bundled tool:

```sh
"$(xcode-select -p)/Applications/Icon Composer.app/Contents/Executables/ictool" \
  apps/mobile/assets/app-icons/Car.icon \
  --export-image --output-file /tmp/car-icon-dark.png \
  --platform iOS --rendition Dark --width 512 --height 512 --scale 1 \
  --design-generation 27
```

Repeat with generation `26` and the other rendition names to review all supported
appearances. System tint and wallpaper can change the final appearance.

Before release, inspect the installed launcher icon on iPhone, iPad and Android,
including Android's circular and rounded-square masks. Renderer output and asset
compilation do not replace that device check.

## References

- [Expo app icons](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/)
- [Apple Icon Composer](https://developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer)
- [Apple app icon guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
