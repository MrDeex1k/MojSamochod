# Faza 6 — aktualizacja zależności, etap 6

Data: 2026-09-04. Zakres: root i `apps/mobile`, bez zmiany głównej wersji Expo SDK ani pinów
Node/NUB. Zmiany instalowano przez `nub exec sfw nub update --latest --exact` z zachowaniem
`minimumReleaseAge: 24h`. `nub.lock` pozostaje jedynym lockfile'em.

## Zaktualizowane pakiety bezpośrednie

| Pakiet                 | Przed   | Po      |
| ---------------------- | ------- | ------- |
| fastq                  | 1.20.0  | 1.20.3  |
| oxfmt                  | 0.65.0  | 0.66.0  |
| oxlint                 | 1.80.0  | 1.81.0  |
| expo                   | 57.0.18 | 57.0.19 |
| expo-constants         | 57.0.16 | 57.0.17 |
| expo-image             | 57.0.3  | 57.0.4  |
| expo-image-manipulator | 57.0.14 | 57.0.15 |
| expo-image-picker      | 57.0.14 | 57.0.15 |
| expo-linking           | 57.0.8  | 57.0.9  |
| expo-notifications     | 57.0.15 | 57.0.16 |
| expo-router            | 57.0.17 | 57.0.18 |
| expo-sharing           | 57.0.16 | 57.0.17 |
| i18next                | 26.4.0  | 26.4.1  |
| react-i18next          | 17.0.12 | 17.0.13 |
| @types/node            | 26.2.0  | 26.4.1  |

## Sprawdzone wyjątki

- React/React DOM 19.2.3 i React Native 0.86.3 pozostają zgodne z macierzą Expo 57.0.19,
  mimo nowszych wydań rejestru. Nie wykonano niezależnego skoku do RN 0.87.
- Tak samo pozostają datetimepicker 9.1.0, Gesture Handler 2.32.0, Reanimated 4.5.1,
  Worklets 0.10.1, Safe Area Context 5.7.0 i Screens 4.26.0.
- Jest 29.7.0 i `@types/jest` 29.5.14 pozostają przy `jest-expo` 57.0.5, którego zależności
  nadal zawierają Babel Jest, globals, snapshot i jsdom z linii Jest 29. Wymuszenie Jest 30
  nie jest aktualizacją zgodnego zestawu.
- NativeWind pozostaje w przyjętej linii 5.0.0-preview.4; nie cofamy go do stabilnej linii 4.
  Override `lightningcss: 1.30.1` jest nadal wymagany według
  [oficjalnej instrukcji NativeWind](https://www.nativewind.dev/v5/getting-started/installation),
  aby uniknąć błędów deserializacji CSS. Nie wymuszono 1.33.0.
- NUB podczas instalacji pokazał także nowsze tagi i18next 26.4.2 i PostCSS 8.5.28, ale wybór
  `update --latest` przy aktywnej karencji pozostawił 26.4.1 i 8.5.26. Nie omijano polityki wieku
  publikacji. Pozostałe bezpośrednie pakiety sprawdzono przez `nub outdated`; nie wymagały zmiany
  w dostępnej zgodnej linii.
- TypeScript 7.0.2 jest świadomym wyjątkiem od zalecenia Expo `~6.0.3`.
- `.node-version` nadal wskazuje 24.18.0, a manifest NUB 0.8.0. Lokalny NUB raportował 0.8.3;
  nie aktualizowano programu ani pinów w ramach zadania.

## Graf przechodni i powiadomienia

NUB odświeżył także zależności przechodnie, m.in. Expo CLI, Metro Runtime, Router Server,
Fingerprint, Expo UI oraz wiązania nowych narzędzi Oxc. Nie wymuszano obcych głównych wersji
przez dodatkowe overrides. `@react-native/metro-config` 0.87.1 występuje jako zależność peer
Worklets; nie zmienia to używanego runtime RN 0.86.3 ani konfiguracji Metro opartej o Expo.
Eksporty obu platform sprawdzają działanie faktycznie rozwiązanego grafu.

`nub deprecations --transitive` nadal raportuje osiem pakietów: `@esbuild-kit/core-utils`,
`@esbuild-kit/esm-loader`, `abab`, `domexception`, `glob` 7, `inflight`, `uuid` 7 i
`whatwg-encoding`. Pochodzą ze stosów narzędziowych Drizzle Kit, Jest/jsdom i Expo/Xcode.
Nie zastępowano ich arbitralnie niezgodnymi wersjami; aplikacja używa bezpośrednio UUID 14.
Wycofanie pakietu z utrzymania nie jest samo w sobie wynikiem audytu konkretnej podatności.

Źródła `expo-notifications` 57.0.16 nadal uruchamiają rejestrację push przez publiczny barrel.
Pozostaje lokalna fasada importów oraz test zakazujący ładowania rejestracji zdalnych tokenów.
Zmiana pakietu nie jest dowodem naprawienia natywnego błędu kanałów w Android Expo Go.
Uprawnienia i harmonogram trzeba zweryfikować we własnej aplikacji w etapie 7.

## Kod i weryfikacja

- Przed aktualizacją: `nub run check`, 57 zestawów / 386 testów.
- Po aktualizacji: `nub run check`, 57 zestawów / 390 testów; lint, format, typy i migracje poprawne.
- Poprawiono pięć przypadków `try/finally` pomijanych przez React Compiler. Sprzątanie stanu
  zapisu pozostaje po obsłużonym sukcesie lub błędzie. Dodatkowe testy obejmują wyjątki zapisu,
  usuwania, zgody, otwarcia ustawień i ponowienia harmonogramu. Nie zmieniono układu ekranów.
- React Doctor 0.9.13: początkowo 73/100, pięć błędów; po poprawkach 83/100, zero błędów,
  11 ostrzeżeń. Skan objął 40 plików, podczas gdy raport przed commitem etapu 5 obejmował 34.
  Pozostałe uwagi: dwie celowo szeregowe pętle harmonogramu, trzy złożone komponenty,
  pięć operacji wyszukiwania w liście maksymalnie trzech wyprzedzeń i jedna ponowna subskrypcja
  callbacku z prawidłowym cleanup. Nie wyciszano reguł ani nie przebudowywano nawigacji.
- Expo Doctor 1.20.4: 19/21; tylko nierozpoznany `nub.lock` i TypeScript 7.
  `CI=1 nub exec expo install --check --json` potwierdza brak innych rozbieżności SDK.
- `nub exec sfw nub install --frozen-lockfile` potwierdza zgodność manifestów i lockfile'a.
- Eksporty natywnych bundle'i Hermes dla iOS i Androida przechodzą; obejmują CSS, SQL i fasadę
  powiadomień. Wyniki robocze są w `/tmp/moje-auto-phase6-step6-ios` i
  `/tmp/moje-auto-phase6-step6-android`, poza repozytorium. To nie buildy aplikacji ani testy UI.
- `nub audit --json` nie uzyskał odpowiedzi HTTP z endpointu advisory rejestru; ponowienie
  z ograniczonym timeoutem też się nie powiodło. Audyt pozostaje **bez wyniku**, nie „czysty”.
  Kontrole SFW przy instalacji nie zastępują tego raportu; ponowić audyt przed zamknięciem fazy.

## Następny etap

Etap 7 nie został wykonany. Wymaga własnych przebudowanych aplikacji i testów na iPhonie,
iPadzie, telefonie Android i tablecie Android. Oprócz przypomnień obejmuje regresje wcześniejszych
funkcji, uprawnienia, rzeczywiste dostarczanie/anulowanie, restart i zmianę strefy. Testy UI
wykonane w etapie 5 w Expo Go nie są akceptacją całej fazy.

Procedura aktualizacji opiera się na
[oficjalnym przewodniku Expo](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).
