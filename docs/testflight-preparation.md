# Przygotowanie TestFlight

Dokument roboczy, aktualizacja 2026-10-12. Dystrybucja Androida jest odłożona decyzją wydawcy.

## Tożsamość

- Nazwa sklepowa widoczna w App Store Connect: `My Car: Daily Drive`.
- Nazwa pod ikoną: `Moje Auto`.
- Bundle ID: `pl.jakubbatycki.mojeauto`; SKU: `mojeauto-ios`.
- Apple Team ID: `KV9BUW5GTH`.
- Aktualna wysłana wersja: `0.8.2`, build `5`, przygotowana lokalnie na Expo SDK 58.
  Wcześniej wysłano `0.8.0` w buildach `1` i `2`.
- Wydawca ma aktywne członkostwo i zgłosił utworzenie rekordu aplikacji.
- Kontakt aplikacji: `mycar@mail.batycki.dev`.

## Aktualizacja 0.8.2 (5): 2026-10-12

- Odświeżono zależności zgodnie z kontraktem Expo SDK 58, przez NUB i Socket
  Firewall, z dokładnymi wersjami i zachowaniem trzygodzinnego okresu karencji.
  Pozostawiono wspierane wersje bibliotek React Native zamiast nowszych,
  niezgodnych z SDK. Szczegóły: [migracja SDK 58](./sdk58-migration.md).
- Szczegóły tankowania mają bezpośrednie akcje edycji i usuwania, nadal
  z potwierdzeniem usunięcia. W ustawieniach rozdzielono tytuł i opis edycji
  pojazdu oraz dodano strzałkę. Preferencje paliwa zajmują dwa równe pola
  w jednym wierszu; przy dużej skali tekstu pozostaje układ pionowy.
  Usunięto pomocniczy opis początkowego licznika.
- Podczas weryfikacji wydawca zgłosił brak powrotu z pustej listy dokumentów.
  Wejście z historii używa teraz push zamiast zastępowania ekranu zakładek.
  Dodano również widoczną akcję powrotu niezależną od systemowego nagłówka
  i test regresyjny. Powrót bez dodawania pliku potwierdzono na Androidzie,
  tablecie Android, symulatorach iPhone i iPad oraz fizycznym iPhonie wydawcy.
- Zmienione ustawienia sprawdzono na czterech symulatorach/emulatorach:
  iPhone 18 Pro, iPad Pro 13-inch (M5), Pixel 9 i Pixel Tablet.
  Na wszystkich czterech targetach zapisano tankowanie, sprawdzono
  bezpośrednie akcje szczegółów i anulowanie potwierdzenia usunięcia.
- `nub run check`: 71 zestawów i 472 testy, wszystkie przeszły. Kontrola
  autolinkingu: Apple 27 modułów, Android 26, bez duplikatów.
  React Doctor dla zmienionych plików: 100/100. Pełny skan: 87/100,
  z istniejącymi uwagami dotyczącymi nierozpoznawanego lockfile NUB,
  sekwencyjnych operacji powiadomień i wyszukiwania w małej liście offsetów.
  Nie zmieniano tych niezwiązanych z poprawką zachowań ani polityki lockfile.
- Expo Doctor: 18/20. Pozostają nierozpoznawany `nub.lock` i rozbieżności
  rekomendacji narzędzi (celowy TypeScript 7 oraz Jest 30 wymagany przez
  zainstalowany `jest-expo`). Nie wyciszano diagnostyki.
- Lokalny Release uruchomiono na fizycznym iPhonie 15 Pro. Proces pozostał
  aktywny po wykonaniu bundla JavaScript; wydawca potwierdził działający
  interfejs oraz poprawiony powrót z dokumentów. Dane zachowano przy instalacji.
- Finalne archiwum: `/private/tmp/MojeAuto-0.8.2-5-documents-fixed.xcarchive`.
  Lokalna archiwizacja i upload przez `xcodebuild -exportArchive` zakończyły
  się powodzeniem: `Upload succeeded`, `Uploaded MojeAuto`, `EXPORT SUCCEEDED`.
  Apple zgłosiło `Uploaded package is processing`. Zakończenie przetwarzania
  i instalacja finalnego buildu przez TestFlight nie są jeszcze potwierdzone.
- Upload zgłosił nieblokujące braki dSYM części frameworków Expo, React,
  bibliotek obrazów i Hermes. Ogranicza to symbolikację awarii tych bibliotek;
  nie oznacza nieudanego uploadu. Log:
  `/private/tmp/moje-auto-feedback-testflight-upload.log`.
  Artefakty w `/private/tmp` są tymczasowe, nie stanowią trwałego archiwum.
- Nie korzystano z EAS, nie publikowano aplikacji w App Store ani nie
  dystrybuowano Androida. Po przetworzeniu należy zainstalować `0.8.2 (5)`
  z TestFlight i ponowić zimny start oraz próbę powrotu z dokumentów.

## Lokalna procedura

Nie używamy EAS. Konfiguracja Expo jest źródłem Bundle ID, Team ID i numerów wersji.
Projekt `apps/mobile/ios` jest generowany i ignorowany przez Git.
Procedura dotyczy [SDK 58 i integracji SwiftPM](./sdk58-migration.md).
Nie stosować `MOJE_AUTO_NATIVE_QA=1` do archiwum przeznaczonego dla tej aplikacji sklepowej.

1. Odtworzyć zależności przez `nub run deps:install`. Lokalny `nub.lock` pozostaje ignorowany.
2. Uruchomić `nub run check`, audyt i Expo Doctor. Rozstrzygnąć ostrzeżenia, nie wyciszać ich.
3. W `apps/mobile` przygotować projekt i integrację SwiftPM:

   ```sh
   MOJE_AUTO_NATIVE_QA=0 CI=1 nub run ios:prepare
   ```

   Skrypt wykonuje potrzebny prebuild, autolinking i codegen, konfiguruje SwiftPM
   oraz zapisuje odciski wejściowe sprawdzane podczas kompilacji w Xcode.

4. Porównać Bundle ID i numer buildu z konfiguracją Expo oraz ostatnim przesłanym buildem.
   Przy kolejnym uploadzie użyć numeru buildu, którego App Store Connect jeszcze nie przyjął.
5. Użyć `NODE_BINARY` zapisanego przez przygotowanie w `ios/.xcode.env`.
   Jeśli istnieje `ios/.xcode.env.local`, sprawdzić, czy jego nadpisanie wskazuje ten sam Node
   co `nub node which`.
6. Otworzyć `apps/mobile/ios/MojeAuto.xcodeproj` w Xcode, sprawdzić Team i automatyczne podpisywanie.
   Archiwizować Release dla urządzeń iOS, nie dla symulatora.
7. Zweryfikować archiwum i dystrybuować przez Organizer do App Store Connect.
   Uzupełnić wymagane deklaracje zgodnie z faktycznym użyciem SDK i kryptografii.
   Nie traktować samego utworzenia archiwum jako potwierdzonego uploadu.
8. Po przetworzeniu buildu sprawdzić go najpierw wewnętrznie przez TestFlight.
   Udostępnienie zewnętrzne i Beta App Review są odrębnymi krokami.

Hasła, certyfikaty i klucze prywatne pozostają poza repozytorium i rozmową.

## Poprawka ekranu startowego 0.8.1 (4) - 2026-10-03

- Zastąpiono domyślną grafikę Expo istniejącym przezroczystym logo samochodu.
  Natywny ekran startowy ma tło `#121212` i wyśrodkowany obraz o szerokości 288 pt;
  po uwzględnieniu przezroczystych marginesów samochód ma około 150 pt szerokości.
- Zachowano wersję `0.8.1`, podniesiono numer buildu iOS z `3` do `4`.
- `nub run check`: 70 zestawów / 471 testów, wszystkie przeszły.
- Expo Doctor `1.20.4`: 18/20, tylko znane uwagi dotyczące `nub.lock` i TypeScript 7.
- Projekt iOS wygenerowano ponownie w konfiguracji produkcyjnej. Sprawdzono
  wygenerowane obrazy 1x/2x/3x oraz wyśrodkowanie w natywnym storyboardzie.
- Archiwizacja i weryfikacja podpisu przeszły. Archiwum `0.8.1 (4)` zapisano w Organizerze:
  `/Users/jakubbatycki/Library/Developer/Xcode/Archives/2026-10-03/MojeAuto-0.8.1-4.xcarchive`.
- Po aktualizacji fizyczny iPhone nadal pokazywał poprzedni systemowy snapshot ekranu
  startowego. Skompilowany katalog zasobów zawierał już nowe logo w rozmiarach
  288/576/864 px. Normalny zimny start uruchomił aplikację poprawnie.
  Wydawca następnie sam usunął aplikację razem z danymi; zainstalowano ponownie build 4.
  To zachowanie odpowiada problemowi opisanemu w
  [Apple TN3118](https://developer.apple.com/documentation/technotes/tn3118-debugging-your-apps-launch-screen).
- Odczyt obrazu `SplashScreenLogo` bezpośrednio z `Assets.car` gotowego archiwum
  potwierdził grafikę samochodu. Restart iPhone'a usunął stary widok. Ponownie
  zainstalowano docelowe archiwum `MojeAuto-0.8.1-4.xcarchive` i potwierdzono logo
  na natywnym ekranie startowym oraz normalny zimny start aplikacji.
  Wydawca również potwierdził poprawne działanie. Dowód:
  `/private/tmp/moje-auto-081-4-splash-after-reboot.png`.
- Próbna zmiana nazwy storyboardu nie rozwiązała problemu i została w całości
  wycofana. Archiwum robocze z sufiksem `-car` nie jest przeznaczone do dystrybucji.
  Nie zmieniano czasu wyświetlania splash screenu ani ustawień bezpieczeństwa Maca.
- Upload sprawdzonego archiwum zakończony: `Uploaded MojeAuto`, `EXPORT SUCCEEDED`.
  Log: `/private/tmp/moje-auto-081-4-upload.log`. Zakończenie przetwarzania Apple
  i dostępność dla testerów nie zostały zweryfikowane. Pozostają nieblokujące
  ostrzeżenia o brakujących dSYM prekompilowanych bibliotek, opisane przy buildzie 3.

## Wydanie 0.8.1 (3), SDK 58 - 2026-10-03

- Podniesiono wersję aplikacji z `0.8.0 (2)` do `0.8.1 (3)`.
- Zaktualizowano 11 bezpośrednich bibliotek do wersji zalecanych przez Expo SDK 58,
  w tym Expo `58.0.3` i powiadomienia `58.1.0`. Zachowano dokładne wersje.
  Instalacja przeszła przez NUB i Socket Firewall po upływie trzech godzin od publikacji;
  nie dodano wyjątków od okresu oczekiwania ani polityki zaufania.
- Ujednolicono rozszerzenia zależności do Expo Modules Core `58.0.12` i przeniesiono
  poprawki SwiftPM na JSI `58.0.8`, SQLite `58.0.9` i Notifications `58.1.0`.
  Poprawka JSI wymagała dostosowania położenia fragmentów w `JSIUtils.h`.
- `nub run check`: 70 zestawów / 471 testów, wszystkie przeszły.
  Kontrola modułów natywnych: Apple 27, Android 26, bez duplikatów.
- Expo Doctor `1.20.4`: 18/20, wyłącznie nierozpoznawany `nub.lock` i zamierzony
  TypeScript `7.0.2` zamiast oczekiwanego `~6.0.3`.
- React Doctor `0.9.14`: 87/100, bez błędów, cztery ostrzeżenia: dwie sekwencyjne
  pętle powiadomień, nierozpoznawany lockfile i wyszukiwanie w trzech opcjach formularza.
- Audyt NUB głównego pakietu zgłasza jedną uwagę moderate: `uuid@7.0.3` przez
  narzędzie `xcode@3.0.1`. Dotyczy funkcji v3/v5/v6 z buforem; odczytany kod
  generatora używa `uuid.v4()` bez bufora. Aplikacja używa `uuid@14.0.2`.
  Wynik audytu obejmuje 175 zależności głównego pakietu; nie jest pełnym audytem
  workspace mobilnego, którego osobny audyt NUB odmawia z powodu braku lokalnego lockfile.
- Produkcyjny projekt SwiftPM przygotowano z `MOJE_AUTO_NATIVE_QA=0` i Node `24.18.0`.
- Po uwadze wydawcy dodano odstęp sekcji pod nagłówkiem listy paliwa (`pb-section`).
  Oddziela przycisk dodawania od pustego stanu i od istniejących tankowań.
  Poprawkę potwierdzono na fizycznym iPhonie 15 Pro w Release oraz na iPadzie Air 11 M4,
  Pixelu 9 i Pixel Tablet w lokalnych aplikacjach QA. Na Apple sprawdzono pusty stan,
  na Androidzie istniejącą listę tankowań. Dane aplikacji zachowano.
  Android Debug przebudowano pomyślnie; połączenie QA z Metro wymagało ADB reverse
  oraz ustawienia hosta `127.0.0.1:8081`. Nie zmieniano konfiguracji produkcyjnej.
- Po poprawce ponownie przeszło 70 zestawów / 471 testów. React Doctor dla zmienionego
  kodu: 100/100, bez uwag. Pełny wcześniejszy wynik 87/100 opisano powyżej.
- Końcowe archiwum: `ARCHIVE SUCCEEDED`, arm64, `0.8.1 (3)`, poprawny Bundle ID,
  podpis zespołu `KV9BUW5GTH` i osadzony `main.jsbundle`. Weryfikacja podpisu
  przez `codesign --verify --deep --strict` przeszła. Archiwum zapisano w Organizerze:
  `/Users/jakubbatycki/Library/Developer/Xcode/Archives/2026-10-03/MojeAuto-0.8.1-3.xcarchive`.
- Release zainstalowano jako aktualizację na sparowanym iPhonie. Zimny start wykonał
  osadzony pakiet JavaScript bez awarii; wydawca potwierdził działanie ekranu i nawigacji.
  Automatyczny odczyt drzewa interfejsu fizycznego urządzenia blokowała konfiguracja
  DevToolsSecurity na Macu; nie zmieniano jej. Zrzuty ekranu były dostępne i pozwoliły
  porównać odstęp przed poprawką oraz po niej.
- Upload poprawionego archiwum zakończono 2026-10-03 o 18:57 czasu polskiego:
  `Upload succeeded`, `Uploaded MojeAuto`, `EXPORT SUCCEEDED`.
  Apple potwierdziło `Uploaded package is processing`. Nie sprawdzano zakończenia
  przetwarzania ani nie zmieniano metadanych i grup testerów w przeglądarce.
  Log: `/private/tmp/moje-auto-081-upload.log`.
- Upload zgłosił nieblokujące braki dSYM części prekompilowanych bibliotek Expo,
  React Native, Hermes i bibliotek obrazów. Ograniczają symbolikację awarii tych bibliotek;
  nie zablokowały przyjęcia pakietu. Pełna lista jest w logu wysyłki.
- Archiwa w `/private/tmp` i IPA z eksportu wykonanego przed poprawką odstępu są
  materiałami roboczymi. Do dalszej dystrybucji używać końcowego archiwum z Organizera.

## Historia weryfikacji SDK 57

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
