# Faza 6 — raport końcowej weryfikacji natywnej

Data: 2026-09-04. Branch: `feat/reminders`, po aktualizacji zależności z `8d9043a`.

## Wynik

Etap 7 wykonany: własne aplikacje natywne uruchomione na czterech formatach urządzeń,
sprawdzone przypomnienia i reprezentatywne regresje wcześniejszych funkcji. Usunięto problem
blokujący build Androida i dodano pięć testów regresyjnych konfiguracji. Faza 6 jest gotowa do
review/PR w momencie zakończenia tych prób; późniejszy merge opisuje uzupełnienie poniżej.
Nie oznacza to gotowości do publikacji w sklepach ani kompletnego audytu bezpieczeństwa.

Nie wykryto blokującego błędu działania przypomnień we własnych buildach. Audyt podatności nadal
nie zwrócił wyniku z endpointu rejestru; pozostaje otwartą kontrolą, a nie wynikiem „brak podatności”.

## Host i buildy

- Własna, odseparowana aplikacja `dev.mojeauto.qa`, nie Expo Go ani Expo Web.
- Expo 57.0.19, React Native 0.86.3, React 19.2.3, `expo-notifications` 57.0.16;
  zależności i `nub.lock` z etapu 6, bez kolejnej aktualizacji pakietów.
- Apple: Xcode 26.6, build Release dla symulatora z osadzonym bundłem, zakończony bez błędów.
- Android: Java 17, Gradle 9.3.1, ARM64, `assembleRelease` zakończony powodzeniem
  (534 zadania); APK zawiera bundle JS i działa bez Metro. Podpis QA, nie podpis sklepowy.
- Procedura odtworzenia: [native-qa-builds.md](native-qa-builds.md).

## Macierz wykonanych prób

| Urządzenie       | System / język / układ           | Sprawdzone zachowanie                                                                                                                                                                                                                                                                                     |
| ---------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iPhone 17 Pro    | iOS 26.5 / PL / pion             | Utworzenie pojazdu i terminu, natywny wybór daty, stan „Dzisiaj”, odmowa zgody bez utraty terminu, odtworzenie po restarcie aplikacji, potwierdzone usunięcie. Tankowanie 42,25 l z licznikiem 10 000 km, szczegóły i zapis edycji bez zmiany ilości; zmiana preferencji na galony US pokazuje 11,16 gal. |
| iPad Air 11 (M4) | iPadOS 26.5 / PL / poziom        | Układ dwukolumnowy, walidacja brakującej daty, natywny picker, zapis i zgoda, anulowanie usuwania, dostarczenie alertu, restart procesu i systemu, zachowana historia/termin, usunięcie i brak oczekujących alertów. Zapis wpisu naprawy i powrót do historii.                                            |
| Pixel 9          | Android 17, API 37 / EN / pion   | Zapis i zgoda, rzeczywisty kanał i alarmy, dostarczenie, edycja wyprzedzenia i daty, zachowanie strefy po zmianie strefy urządzenia, odebranie/przywrócenie zgody, odtworzenie alarmów po restarcie systemu, usunięcie, miniony termin ze stanem „Overdue” bez zaległych alarmów.                         |
| Pixel Tablet     | Android 17, API 37 / EN / poziom | Utworzenie pojazdu i terminu, odmowa zgody, trwałość po restarcie aplikacji, adaptacyjny układ. Import PDF z lokalnych plików, zapis, szczegóły i natywny arkusz udostępniania; zdjęcie BMW z galerii, przycięcie, zapis i proporcje 1:1.                                                                 |

Na wszystkich czterech urządzeniach wykonano podstawowy przepływ przypomnienia. Rozszerzone
scenariusze rozdzielono pomiędzy urządzenia; nie wykonywano każdej kombinacji CRUD każdej funkcji
na każdym urządzeniu. Dark Mode pozostał bez zmian (`#121212`). Tablety testowano w poziomie;
po restarcie iPad w pionie poprawnie pokazał istniejącą prośbę o obrót, a po obrocie odtworzył widok.

## Powiadomienia — dowody i granice próby

### Android

- Odczyt `dumpsys alarm` potwierdził alarm na 09:00 w `Europe/Warsaw`, z systemowym oknem
  niedokładnego dostarczenia około godziny. Nie dodano uprawnienia do dokładnych alarmów.
- Po wyłączeniu wyprzedzenia „w dniu terminu” dzisiejszy termin nie miał przyszłych alarmów.
- Zmiana strefy urządzenia na `America/New_York` nie zmieniła strefy istniejącego terminu
  w formularzu ani jego ustawień. Strefę urządzenia przywrócono do `Europe/Warsaw`.
- Na dedykowanym emulatorze chwilowo przesunięto zegar za okno alarmu; systemowa lista
  powiadomień potwierdziła własny identyfikator, tytuł „Insurance deadline” i kanał
  `vehicle-reminders-v1`. Następnie przywrócono zegar i `auto_time=1`, `auto_time_zone=1`.
- Edycja daty na 20 września odtworzyła trzy alarmy: 13, 19 i 20 września o 09:00.
- Odebranie zgody usunęło alarmy bez utraty danych; przywrócenie zgody i otwarcie aplikacji
  odtworzyło trzy alarmy. Po restarcie emulatora wróciły po zakończeniu `BOOT_COMPLETED`,
  jeszcze przed otwarciem UI. Nie należy oceniać tego wyłącznie po `sys.boot_completed=1`.
- Usunięcie terminu usunęło alarmy. Zapis minionego badania technicznego (1 września)
  pokazał „Overdue”, bez planowania zaległych alertów.

### Apple

- Natywne API `UNUserNotificationCenter`, odczytane przez debugger własnej aplikacji QA,
  potwierdziło oczekujący identyfikator `reminder:…:0` i dostarczenie polskiej treści z pojazdem/datą.
- Do szybkiej próby transportu skrócono wyłącznie natywny trigger istniejącego, własnego
  żądania, zachowując identyfikator i treść. Nie zmieniano kodu domeny ani terminu w SQLite.
- Próby obejmowały foreground, zamknięty proces (30 sekund) i pełny restart symulatora
  (120 sekund). API potwierdziło dostarczenie po restarcie procesu o 05:58:18 UTC i po restarcie
  systemu o 06:10:08 UTC. To przyspieszona próba transportu, nie obserwacja naturalnego alarmu
  o 09:00. Normalny harmonogram odtwarzało uzgadnianie; końcowe usunięcie terminu pozostawiło
  pustą listę oczekujących powiadomień.
- APNs i zdalny push nie były używane. Nie jest to gwarancja punktualnego dostarczenia na
  fizycznym urządzeniu z dowolnymi ustawieniami skupienia lub oszczędzania energii.

## Poprawki wynikające z weryfikacji

1. Płaskie pliki lokalizacji zawierały klucze Apple, które Expo generowało również jako zasoby
   Androida. Release lint zatrzymywał build na czterech błędach `ExtraTranslation`.
   Rozdzielono zasoby na `ios` i `android`, zachowując Apple display name/opis dostępu do zdjęć
   i dodając właściwy Android `app_name`. Nie wyłączano linta. Test rzeczywistego resolvera
   Expo był czerwony przed poprawką i zielony po niej; build Androida przeszedł.
2. Dodano jawną, testowaną konfigurację identyfikatora lokalnej aplikacji QA; bez flagi
   konfiguracja pozostaje niezmieniona. Nie ustalano identyfikatorów produkcyjnych.
3. Udokumentowano uruchamianie buildów przez NUB `--node` i SFW. Rozwiązuje to problem
   interpretacji konfiguracji TypeScript zależności przez rozszerzony runtime podczas budowania;
   bez zmiany wersji Node i bez poprawek w `node_modules`.

Apple binary powstał przed rozdzieleniem plików locale; wynik resolvera dla iOS pozostał
identyczny i jest objęty regresją. Android przebudowano po poprawce jego zasobów.

## Kontrole automatyczne

- `nub run check`: PASS, 59 zestawów / 395 testów; lint, format, typy i kontrola migracji również PASS.
- React Doctor 0.9.13: 83/100, 0 błędów, 11 ostrzeżeń, bez regresji względem etapu 6.
  Ostrzeżenia obejmują sekwencyjne operacje, złożoność komponentów i istniejące wzorce callbacków;
  nie wyciszano reguł. Szczegóły klasyfikacji pozostają w raporcie etapu 6.
- Expo Doctor: 19/21; tylko nierozpoznawany `nub.lock` i świadomy TypeScript 7.0.2
  zamiast sugerowanego 6.0.3. Nie dodano obcego lockfile'a ani wykluczeń kontroli.
- Ponowiony audyt podatności nie uzyskał odpowiedzi HTTP. SFW przy pobieraniu zależności
  nie zastępuje raportu podatności. Audyt należy ponowić przed wydaniem i ujawnić brak wyniku w PR.
- Granice dni, DST, brak wyprzedzeń, błędy/retry, izolacja i kaskadowe usuwanie oraz JSON v4
  sprawdzane są automatycznie. Eksport JSON nie ma osobnego przycisku w obecnym UI: jego
  zgodność zweryfikowano testami, nie ręcznym eksportem na czterech urządzeniach.

## Uzupełnienie po review i integracji

Faza 6 została zintegrowana z `main` w commicie `522c2cf`. Przed mergem poprawiono zgłoszony
przez CodeRabbit problem: wyjątek subskrybenta nie przerywa powiadamiania pozostałych odbiorców
ani nie blokuje kolejnych uzgodnień. Wewnętrzna kolejka zachowuje spełnioną obietnicę.
Dodano trzy regresje: izolację listenera/publikację wyniku, kolejne przebiegi i uzgadnianie
wywołane po zapisie repozytorium. `nub run check` przeszedł z 398 testami w 59 zestawach;
React Doctor pozostał na 83/100 i 11 ostrzeżeniach. Wynik 395 powyżej opisuje wcześniejszą próbę.
Po tej izolowanej zmianie logiki nie powtarzano macierzy natywnej; nie zmieniono UI ani konfiguracji.

## Dalsze działania

Ustalenia Fazy 7 — utwardzenie aplikacji: prywatność i zarządzanie danymi,
odzyskiwanie, dostępność, skrajne warunki, pomiary wydajności, podpisy/buildy sklepowe i testy
na fizycznych urządzeniach. Zachowanie powiadomień przy politykach OEM/baterii oraz rzeczywiste
dostarczenie w docelowych warunkach muszą wejść do checklisty wydania.
