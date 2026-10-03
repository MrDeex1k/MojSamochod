# Przygotowanie TestFlight

Dokument roboczy, aktualizacja 2026-10-01. Android jest odłożony decyzją wydawcy.

## Tożsamość

- Nazwa sklepowa zaakceptowana w App Store Connect: `My Car: Ownership Journal`.
- Nazwa pod ikoną: `Moje Auto`.
- Bundle ID: `pl.jakubbatycki.mojeauto`; SKU: `mojeauto-ios`.
- Apple Team ID: `KV9BUW5GTH`.
- Aktualny kandydat naprawczy: `0.8.0`, build `2`. Build `1` wysłano wcześniej.
  Przed kolejną wysyłką sprawdzić zajęte numery buildów.
- Wydawca ma aktywne członkostwo i zgłosił utworzenie rekordu aplikacji.
- Kontakt aplikacji: `mycar@mail.batycki.dev`.

## Lokalna procedura

Nie używamy EAS. Konfiguracja Expo jest źródłem Bundle ID, Team ID i numerów wersji.
Projekt `apps/mobile/ios` jest generowany i ignorowany przez Git.
Nie stosować `MOJE_AUTO_NATIVE_QA=1` do archiwum przeznaczonego dla tej aplikacji sklepowej.

1. Odtworzyć zależności przez `nub run deps:install`. Lokalny `nub.lock` pozostaje ignorowany.
2. Uruchomić `nub run check`, audyt i Expo Doctor. Rozstrzygnąć ostrzeżenia, nie wyciszać ich.
3. W `apps/mobile` wygenerować projekt:

   ```sh
   MOJE_AUTO_NATIVE_QA=0 CI=1 nub exec --node sfw nub exec --node expo prebuild --platform ios --no-install --skip-dependency-update react,react-native
   ```

4. Sprawdzić diff: prebuild może zmienić skrypty `ios`/`android` w package.json.
   Zachować dotychczasowe skrypty, jeśli ich zmiana nie jest zamierzona.
5. W `apps/mobile/ios` wykonać `MOJE_AUTO_NATIVE_QA=0 nub exec --node sfw pod install`.
6. W lokalnym `.xcode.env.local` wskazać `NODE_BINARY` na wynik `nub node which`.
   Nie używać przypadkowego Node z NVM ani systemowego PATH.
7. Otworzyć `MojeAuto.xcworkspace` w Xcode, sprawdzić Team i automatyczne podpisywanie.
   Archiwizować Release dla urządzeń iOS, nie dla symulatora.
8. Zweryfikować archiwum i dystrybuować przez Organizer do App Store Connect.
   Uzupełnić wymagane deklaracje zgodnie z faktycznym użyciem SDK i kryptografii.
   Nie traktować samego utworzenia archiwum jako potwierdzonego uploadu.
9. Po przetworzeniu buildu sprawdzić go najpierw wewnętrznie przez TestFlight.
   Udostępnienie zewnętrzne i Beta App Review są odrębnymi krokami.

Hasła, certyfikaty i klucze prywatne pozostają poza repozytorium i rozmową.

## Weryfikacja bieżąca

- Przed przygotowaniem: `nub run check` przeszedł, 68 zestawów / 463 testy.
- Odtworzono lokalny lockfile bez zmiany wersji bezpośrednich zależności.
- Audyt głównego pakietu zwrócił zero ostrzeżeń dla raportowanych 251 zależności.
  To nie potwierdza pełnego audytu workspace mobilnego.
- Expo Doctor: 18/21. Znane uwagi dotyczą NUB i TypeScript 7; dodatkowo wykryto
  wielokrotne kopie tych samych wersji `expo-constants`, `expo-file-system`
  i `@expo/dom-webview`. To wynik sprzed poprawki opisanej poniżej.
- Produkcyjny projekt iOS i instalacja CocoaPods zostały przygotowane.
- Archiwum `/private/tmp/MojeAuto-0.8.0-1.xcarchive`: `ARCHIVE SUCCEEDED`.
  Potwierdzono Bundle ID, Team, wersję `0.8.0`, build `1`, architekturę arm64
  i obecność `main.jsbundle`.
- Eksport `/private/tmp/moje-auto-testflight-export/MojeAuto.ipa`: `EXPORT SUCCEEDED`.
  Raport dystrybucji potwierdza podpis `Cloud Managed Apple Distribution` zespołu wydawcy.
  To podpis Apple, nie użycie EAS ani zdalny build.
- Nie wysłano buildu do App Store Connect. Duplikaty modułów występują również po
  deduplikacji lockfile, wymuszonym relinkowaniu oraz czystej instalacji przez SFW.
  Nie były więc wyłącznie pozostałością starego `node_modules`. Poprawkę opisano poniżej.
  Kandydat został później przebudowany z poprawionym grafem (wynik poniżej).
  Przed udostępnieniem testerom nadal pozostaje test uruchomienia.
- Stare `node_modules` zachowano w `/private/tmp/moje-auto-deps.O2LqiV/node_modules`.
  To odzyskiwalna kopia lokalna, nie element repozytorium. Artefakty w `/private/tmp`
  również są tymczasowe; nie traktować ich jako trwałego archiwum wydania.

### Diagnoza duplikatów

Powtarzalny test z `apps/mobile`:

```sh
nub exec --node expo-modules-autolinking verify --platform ios 2>&1 | awk '/Found duplicate installations/ { bad=1 } { print } END { exit bad }'
```

Samo `verify` zwraca zero również przy ostrzeżeniach; powyższa kontrola zwraca 1,
gdy występuje dokładnie badany problem. Wykrywa trzy nazwy i cztery dodatkowe kopie.

Próby `isolated` i `hoisted` wykazały ten sam problem. Jawne
`dedupe-peer-dependents=true` wraz z ponownym rozwiązaniem grafu również nie pomogło.
Przywrócono dotychczasową konfigurację `hoisted`, bez nieskutecznego dodatkowego ustawienia.
Wersje wszystkich deklarowanych dependencies, optionalDependencies i peerDependencies
porównanych kopii są zgodne. Dla `expo-constants` w układzie isolated również
`expo` i `react-native` rozwiązują się do tych samych realnych ścieżek, mimo osobnych
katalogów kontekstów peer. Wyniki wskazują na nadmiarową materializację kontekstów
przez instalator, nie konflikt wersji tych trzech modułów. Nie potwierdzono jeszcze
poprawki upstream. Była to hipoteza pośrednia, skorygowana przez dalszą diagnozę poniżej.

Faktycznie uruchamiany NUB zgłasza `0.9.3`. Odczyt GitHub Releases z 2026-09-22
potwierdził, że to najnowsza stabilna wersja (wydana 2026-09-19). Na prośbę wydawcy
ujednolicono `devEngines.packageManager.version` z `0.8.0` do `0.9.3`.
Nie aktualizowano binarki ani Node. Rozbieżność deklaracji nie była przyczyną duplikatów:
wszystkie opisane próby już korzystały z NUB 0.9.3.
Nie dodano skryptu ręcznie usuwającego kopie, wykluczeń autolinkingu ani wyciszenia Expo Doctor.

### Rozwiązanie

Lockfile ujawnił różnicę niewidoczną w samych opublikowanych manifestach: NUB uwzględniał
opcjonalne peer dependency `expo-modules-core` w części kontekstów, ale nie we wszystkich.
Próba zadeklarowania go bezpośrednio potwierdziła przyczynę, ale Expo Doctor odradza
tę zależność na poziomie aplikacji, więc wycofano ten wariant.

Końcowa poprawka to trzy wersjonowane wpisy `packageExtensions` w głównym `package.json`:
`expo-constants@57.0.19`, `expo-file-system@57.0.7` i `@expo/dom-webview@57.0.1`
dostają jawne `dependencies.expo-modules-core: 57.0.18`. Ich opublikowany kod importuje
ten moduł, ale deklaracje zastosowane przez resolver pozostawiały go opcjonalnym peerem.
Wpisy zapewniają spójne rozwiązanie wymaganej zależności dla każdej ścieżki instalacji.
Jest to ta sama wersja, z której korzystało już Expo 57.0.24; nie zmieniono SDK,
Node ani kodu bibliotek. Przy aktualizacji tych pakietów ponownie ocenić potrzebę wpisów.

Po instalacji z nową deklaracją zniknęły trzy dodatkowe kopie. Pozostała stara kopia
`expo-constants` pod `expo-asset`, mimo pojedynczego wariantu w lockfile. Czysta instalacja
usunęła tę pozostałość. Kontrola autolinkingu zwraca brak duplikatów dla Apple (27 modułów)
i Androida (26 modułów). Kopie instalacji testowych zachowano lokalnie w
`/private/tmp/moje-auto-peer-fix.aO7Z0F/node_modules` oraz
`/private/tmp/moje-auto-extension-fix.Gkq7Fl/node_modules`.

Dodano `nub run native:check` do standardowego `nub run check`. Kontrola analizuje JSON
autolinkingu dla Apple i Androida i kończy się błędem przy duplikatach, błędzie narzędzia
lub nieoczekiwanym formacie wyniku. Nie opiera się na kodzie wyjścia `verify`, który
sam w sobie nie sygnalizuje duplikatów błędem. Obejmuje moduły Expo raportowane przez
`search`; pełny Expo Doctor pozostaje osobnym wymaganiem wydania.

Końcowa czysta instalacja z `packageExtensions` potwierdziła brak duplikatów na obu
platformach, bez bezpośredniego `expo-modules-core` w aplikacji. Expo Doctor: 19/21,
wyłącznie znane uwagi o nierozpoznawanym `nub.lock` i TypeScript 7. Instalacja CocoaPods
przeszła (111 podów). Ostrzeżenia nie są wyciszone.

### Ponowne archiwum po poprawce

- Lokalna kompilacja Release zakończona `ARCHIVE SUCCEEDED`:
  `/private/tmp/MojeAuto-0.8.0-1-deduped.xcarchive`.
- Eksport zakończony `EXPORT SUCCEEDED`:
  `/private/tmp/moje-auto-testflight-deduped-export/MojeAuto.ipa`.
- Potwierdzono `pl.jakubbatycki.mojeauto`, wersję `0.8.0`, build `1`, arm64
  i obecność `main.jsbundle`. Eksport ma podpis `Cloud Managed Apple Distribution`,
  profil App Store zespołu `KV9BUW5GTH` i `get-task-allow: false`.
- Weryfikacja podpisu archiwum oraz aplikacji wypakowanej z IPA przez
  `codesign --verify --deep --strict` przeszła z dostępem do systemowego magazynu zaufania.
- Ponowny `nub run check`: 68 zestawów, 463 testy. Kontrola autolinkingu:
  Apple 27 modułów, Android 26 modułów, bez duplikatów.
- Upload do App Store Connect wykonano 2026-09-22 przez lokalny `xcodebuild -exportArchive`
  z `destination: upload`. Wynik: `Upload succeeded`, `Uploaded MojeAuto`,
  `EXPORT SUCCEEDED`; Apple zgłosiło `Uploaded package is processing`.
  Nie potwierdzono jeszcze zakończenia przetwarzania ani dostępności w TestFlight.
- Upload zgłosił nieblokujące ostrzeżenia o brakujących dSYM dla `React`,
  `ReactNativeDependencies`, `SDWebImage`, `SDWebImageAVIFCoder`, `SDWebImageSVGCoder`,
  `SDWebImageWebPCoder`, `hermesvm` i `libavif`. Mogą ograniczać czytelność raportów
  awarii wewnątrz tych bibliotek; wymagają osobnego sprawdzenia przed wydaniem docelowym.
  Log: `/private/tmp/moje-auto-testflight-upload.log`.
- Nie wykonano testu uruchomienia tego buildu na urządzeniu. Następny krok to sprawdzenie
  przetworzenia przez Apple i test wewnętrzny na iPhonie przez TestFlight.
  Nie używać starszego IPA sprzed poprawki. Nie zgłoszono publikacji sklepowej
  ani nie dodano testerów zewnętrznych.
- Artefakty w `/private/tmp` są tymczasowe i nie stanowią trwałego archiwum wydania.

## Awaria przy starcie na iOS 27: naprawa 2026-10-01

Na fizycznym iPhonie 15 Pro z iOS 27.0.1 odtworzono natychmiastową awarię wersji
`0.8.0 (1)`: `SIGTRAP` w
`UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`. Dwie próby uruchomienia
przez `devicectl` zakończyły się sygnałem 5. Raporty wskazywały na brak cyklu życia
UIScene, nie błąd JavaScript ani wcześniejsze duplikaty modułów.

Dodano oficjalny plugin `expo-build-properties@57.0.21`, zgodny z lokalną listą
pakietów Expo 57.0.24, z `ios.enableSceneSupport: true`. Generuje on manifest scen
oraz przenosi tworzenie okna i start React Native do `ExpoAppSceneDelegate`.
AppDelegate implementuje `ExpoReactNativeFactoryProvider`. Poprawka pozostaje
w konfiguracji Expo, a nie wyłącznie w ignorowanym projekcie Xcode.

Test regresyjny manifestu scen najpierw nie przeszedł, a po poprawce przeszedł.
Pełny `nub run check`: 69 zestawów, 464 testy. Expo Doctor: 19/21; zgłasza brak
rozpoznawanego lockfile oraz rozbieżności wersji (celowy TypeScript 7 i dostępne
nowsze poprawki Expo). Nie wyciszano diagnostyki ani nie aktualizowano całego SDK.
Na hoście zastano NUB 0.9.6, przy deklaracji 0.9.3 w repo; nie zmieniano instalacji
NUB ani deklarowanej wersji w ramach tej naprawy.

Lokalny Release `0.8.0 (2)` zainstalowano jako aktualizację na tym samym iPhonie,
bez odinstalowywania aplikacji i bez kasowania danych. Log potwierdził wykonanie
bundla JavaScript, proces pozostał aktywny i nie pojawił się nowy raport awarii.
Wydawca potwierdził działający interfejs. Automatyczny odczyt UI przez XCTest był
zablokowany przez wyłączony tryb narzędzi deweloperskich na Macu; nie zmieniano
ustawień bezpieczeństwa hosta. Pełne testy funkcjonalne nadal wykonujemy w TestFlight.

W kolejnych wydaniach oprócz testów i udanego archiwum wymagany jest zimny start
Release na fizycznym iPhonie z docelowym iOS. Sam sukces archiwizacji i uploadu
nie weryfikuje zgodności cyklu życia aplikacji z systemem.

Archiwum `/private/tmp/MojeAuto-0.8.0-2-scenes.xcarchive` przeszło archiwizację
i zawiera prawidłowy manifest scen. Build `0.8.0 (2)` wysłano do App Store Connect
2026-10-01: `Uploaded MojeAuto`, `EXPORT SUCCEEDED`. Nie potwierdzono jeszcze
zakończenia przetwarzania przez Apple. Po udostępnieniu buildu należy zainstalować
go z TestFlight i powtórzyć zimny start. Telefon ma obecnie lokalny Release podpisany
dewelopersko, a nie pobrany ponownie build TestFlight. Nie publikowano aplikacji w sklepie.
