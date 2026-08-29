# Moje Auto

Edukacyjna aplikacja mobilna do prowadzenia historii samochodu, rozwijana dla Androida, iOS oraz iPadOS.

Repozytorium jest lekkim monorepo zarządzanym wyłącznie przez NUB. Obecnie zawiera jeden pakiet: aplikację React Native z Expo i TypeScript.

## Dokumentacja produktu

- [Założenia produktu](./docs/README.md)
- [Model domenowy historii pojazdu](./docs/domain-model.md)
- [Zakres MVP i mapa ekranów](./docs/product-scope.md)
- [Technologie i architektura](./docs/technology.md)
- [Kierunek designu](./docs/design-direction.md)
- [Fazy realizacji](./docs/delivery-plan.md)

## Aktualny stos

- Expo SDK 57,
- React Native 0.86,
- React 19.2,
- NativeWind 5 preview,
- Tailwind CSS 4,
- Expo Router,
- TypeScript 7,
- Oxlint i Oxfmt.

NativeWind 5 pozostaje wersją przedprodukcyjną. Projekt korzysta z niej świadomie, aby pracować z integracją Tailwind CSS 4 i `react-native-css`.

## Struktura

```text
.
├── apps/
│   └── mobile/       # aplikacja React Native + Expo
├── .github/          # szablony zgłoszeń i pull requestów
├── package.json      # skrypty główne i konfiguracja workspace
└── nub.lock          # lockfile zależności NUB
```

## Wymagania

- NUB 0.7.5 lub zgodny,
- Node.js 24.18.0, przypięty w `.node-version`,
- Xcode do uruchamiania aplikacji na urządzeniach Apple,
- Android Studio, Android SDK i JDK 17 do uruchamiania aplikacji na Androidzie.

## Uruchomienie

Wszystkie polecenia wykonujemy z katalogu głównego repozytorium:

```sh
nub run deps:install
nub run dev
```

Po uruchomieniu Expo można wybrać platformę w terminalu albo skorzystać z dedykowanych poleceń:

```sh
nub run ios
nub run android
nub run web
```

Kontrola jakości:

```sh
nub run lint
nub run format:check
nub run typecheck
nub run check
```

Automatyczne poprawki i formatowanie:

```sh
nub run lint:fix
nub run format
```

Nie używamy npm, pnpm, Yarn ani Bun do instalowania zależności lub uruchamiania skryptów projektu.

## Commity

Husky i commitlint wymagają formatu Conventional Commits:

```text
typ(opcjonalny-zakres): krótki opis
```

Przykłady:

```text
feat(mobile): add vehicle form
fix(mobile): preserve odometer value
docs: update development setup
chore(repo): update tooling
```

## Współpraca i bezpieczeństwo

- Błędy: [GitHub Issues](https://github.com/MrDeex1k/MojSamochod/issues)
- Pomysły i pytania: [GitHub Discussions](https://github.com/MrDeex1k/MojSamochod/discussions)
- Podatności: [GitHub Private Vulnerability Reporting](https://github.com/MrDeex1k/MojSamochod/security/advisories/new)

Przed przesłaniem zmian przeczytaj `CONTRIBUTING.md` oraz `CLA.md`. Zasad bezpieczeństwa dotyczących zgłoszeń należy szukać w `SECURITY.md`.

## Licencja

Repozytorium jest publicznie widoczne, ale nie jest projektem open source. Szczegółowe warunki znajdują się w `LICENSE`.

Copyright © 2026 Jakub Batycki. All rights reserved.
