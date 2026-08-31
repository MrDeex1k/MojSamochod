# Architektura lokalnej persystencji

## Status dokumentu

**Status:** zrealizowany fundament techniczny

**Faza realizacji:** Faza 2 — zakończona

Ten dokument jest roboczym opisem decyzji wdrożeniowych dla pierwszej wersji lokalnej bazy danych.
Uzupełnia model domenowy, ale nie zmienia zatwierdzonych reguł produktu.

## Stos technologiczny

- `expo-sqlite` zapewnia natywną, trwałą bazę SQLite na iOS, iPadOS oraz Androidzie.
- Drizzle ORM zapewnia typowany schemat, zapytania i mapowanie rekordów.
- Drizzle Kit generuje jawne migracje SQL, które są przeglądane i commitowane razem ze zmianą
  schematu.
- Ekrany nie importują klienta Drizzle. Dostęp do danych przechodzi przez przypadki użycia i
  interfejsy repozytoriów.
- Pierwszy sprawdzony zestaw używa `expo-sqlite` 57.0.2, `expo-crypto` 57.0.2, Drizzle ORM 0.45.2,
  Drizzle Kit 0.31.10 oraz `uuid` 14.0.2. Pakiety są przypięte dokładnie i instalowane przez NUB oraz
  SFW.

## Identyfikatory i czas

- `VehicleId`, `HistoryEntryId` oraz przyszłe `ManagedFileId` używają UUIDv7.
- UUIDv7 jest wyłącznie niezmienną, globalnie unikalną tożsamością rekordu. Kod domenowy nie odczytuje
  z niego daty ani nie używa jego części czasowej do sortowania, wyświetlania lub walidacji.
- Moment utworzenia i ostatniej zmiany rekordu jest przechowywany osobno w `createdAt` i `updatedAt`.
- Czas zdarzenia historii jest przechowywany osobno w wymaganym polu `occurredAt`.
- Wszystkie trzy pola czasu są kanonicznymi znacznikami UTC zapisanymi jako tekst ISO 8601, na
  przykład `2026-08-30T14:30:00.000Z`.
- Formularz wpisu pokazuje osobne kontrolki `Data` i `Godzina (UTC)`. Warstwa aplikacyjna łączy je w
  jedno `occurredAt`; SQLite przechowuje tylko jedną kolumnę `occurred_at`.
- Pierwszy formularz wybiera godzinę z dokładnością do minuty. Sekundy i milisekundy zapisywane są
  jako zero.
- Zdarzenie z `occurredAt` późniejszym niż bieżący czas UTC jest odrzucane.

## Pierwszy schemat

Pierwsza wersja schematu obejmuje:

- tabelę pojazdów;
- wspólną tabelę wpisów historii;
- osobne tabele szczegółów przeglądu, wymiany i naprawy;
- klucze obce, indeksy i ograniczenia potrzebne do zachowania niezmienników;
- tabelę migracji używaną przez Drizzle.

Schemat jest zdefiniowany w `apps/mobile/infrastructure/database/schema.ts`, a pierwsza migracja
znajduje się w `apps/mobile/infrastructure/database/migrations`. Ograniczenia SQLite zabezpieczają
dozwolone typy wpisów, nieujemne odległości i kwoty, kompletność pary kwota–waluta oraz maksymalne
długości pól. Złożone klucze obce nie pozwalają połączyć szczegółów przeglądu, wymiany lub naprawy z
wpisem innego typu, a triggery SQLite nie pozwalają połączyć dokumentu z wpisem należącym do innego
pojazdu. Usunięcie wpisu najpierw odłącza od niego dokumenty w tej samej transakcji, dzięki czemu
pozostają one przypisane do pojazdu. Utworzenie wspólnego rekordu i dokładnie jednego rekordu
szczegółów pozostaje niezmiennikiem transakcyjnym repozytorium.

Kolejne migracje dodają metadane zarządzanych plików, trwałe odwołanie pojazdu do zdjęcia oraz tabelę
dokumentów. Nie powstają jeszcze puste tabele tankowań, przypomnień, subskrypcji ani synchronizacji.
Limit jednego bezpłatnego pojazdu jest egzekwowany przez przypadek użycia, a nie przez konstrukcję
schematu, aby późniejsze Premium nie wymagało przebudowy tożsamości danych. Schemat przechowuje
stabilne identyfikatory zarządzanych plików i nigdy nie przechowuje ich bezwzględnych ścieżek
systemowych.

## Migracje i transakcje

- Każda zmiana schematu otrzymuje wygenerowaną, wersjonowaną migrację SQL.
- Migracje generujemy z krótką, opisową nazwą w języku angielskim zapisaną w `snake_case`, na
  przykład `nub run db:generate --name add_managed_files`. Nie akceptujemy losowych nazw
  proponowanych domyślnie przez Drizzle Kit.
- Migracje są dołączane do aplikacji i wykonywane przed udostępnieniem edytowalnego interfejsu.
- Nieudana migracja prowadzi do jawnego stanu błędu i nie jest interpretowana jako brak danych.
- Aplikacja otwiera bazę `moje_auto.db` asynchronicznie, włącza tryb WAL i egzekwowanie kluczy
  obcych, a następnie wykonuje oczekujące migracje. Podczas inicjalizacji pokazuje stan ładowania;
  po błędzie zachowuje plik bazy, nie pokazuje technicznych szczegółów użytkownikowi i pozwala
  ponowić operację.
- Utworzenie albo aktualizacja wpisu wraz ze zmianą aktualnego przebiegu pojazdu jest jedną
  transakcją.
- Usuwanie jest trwałe. Wpisy pojazdu mogą korzystać z relacji `ON DELETE CASCADE`, ale usunięcie
  agregatu pozostaje jawnym przypadkiem użycia.

## Zarządzane pliki i ObjectStorage

Zdjęcia oraz dokumenty nie są przechowywane jako BLOB-y w SQLite. Konstrukcja rozdziela:

- binarną zawartość w zarządzanym katalogu aplikacji;
- metadane i relacje w SQLite;
- operacje na plikach za interfejsem `ObjectStorage`.

Metadane zarządzanego pliku obejmują stabilny `ManagedFileId`, klucz magazynowy,
rodzaj, MIME type, oryginalną nazwę, rozmiar, sumę SHA-256 oraz znaczniki czasu. Pojazd lub dokument
odwołuje się do stabilnego identyfikatora, a nie do ścieżki źródłowej użytkownika.

Faza 3 implementuje lokalny `ObjectStorage` i koordynację metadanych ze zdjęciem pojazdu, a Faza 4
wykorzystuje tę samą granicę dla dokumentów. Granica może w przyszłości otrzymać inną implementację,
ale obecny zakres nie wprowadza S3, Cloudflare R2 ani innej chmury.

Kontrakt rozdziela `stage`, `commit`, `discard`, `listStagedKeys`, `delete`, `getUri` oraz `copyTo`.
Etapowanie kopiuje zewnętrzny URI do prywatnego obszaru tymczasowego, sprawdza rozmiar przed
odczytaniem zawartości i wylicza SHA-256. `commit` przenosi obiekt do trwałego magazynu i musi być
idempotentny dla tego samego obiektu. `discard` oraz `delete` również są idempotentne: brak
wskazanego obiektu oznacza powodzenie. `listStagedKeys` umożliwia usuwanie osieroconego stagingu,
`getUri` udostępnia prywatny URI do natywnego podglądu, a `copyTo` zapewnia kontrolowaną drogę do
późniejszego eksportu bez ujawniania wewnętrznej ścieżki magazynu.

SQLite i system plików nie tworzą wspólnej transakcji ACID. Koordynacja działa więc w dwóch etapach:

1. plik trafia do stagingu i otrzymuje sumę SHA-256;
2. SQLite zapisuje metadane w stanie oczekującym;
3. `ObjectStorage.commit` utrwala plik;
4. krótka operacja SQLite oznacza metadane jako gotowe;
5. zapis pojazdu tworzy relację do gotowego pliku, a niepowodzenie uruchamia jego odtwarzalne
   usunięcie.

Przerwanie procesu pozostawia stan możliwy do naprawienia, a nie gotowy rekord wskazujący na
nieistniejący plik. Procedura uzgadniania przy starcie usuwa osierocony staging, kończy stan
oczekujący, ponawia rozpoczęte usunięcie oraz usuwa gotowe zdjęcie lub dokument bez relacji. Usuwanie
działa analogicznie: najpierw oznaczenie metadanych, potem idempotentne usunięcie obiektu, a na końcu
usunięcie rekordu. Surowe klucze magazynu są nieprzezroczyste, względne i nie mogą zawierać segmentów
`.` lub `..`, ścieżek absolutnych ani separatorów systemowych.

## Eksport

Faza 2 dostarcza wersję 1 JSON z pojazdem i historią. Faza 4 wprowadza wersję 2, która dodaje
metadane dokumentów, ale nadal nie zawiera plików binarnych. Przenośny backup zostanie później
rozszerzony do archiwum z manifestem JSON oraz katalogiem obiektów, bez umieszczania binarnej
zawartości w bazie SQLite ani kodowania jej jako Base64 w JSON.

## Granice implementacji

- Drizzle jest szczegółem infrastruktury, a nie typem domenowym.
- Repozytoria zwracają modele domenowe i typowane błędy.
- UUIDv7 generuje dedykowany `IdGenerator`, dzięki czemu testy mogą używać deterministycznych
  identyfikatorów.
- Produkcyjny generator przekazuje implementacji UUIDv7 16 bajtów z natywnego,
  kryptograficznie bezpiecznego `expo-crypto.getRandomValues`; nie korzysta z deweloperskiego
  fallbacku `Math.random`.
- Zegar jest wstrzykiwany przez interfejs, aby walidacja przyszłego `occurredAt` i metadanych czasu
  była deterministyczna w testach.
- Zapytania historii sortują malejąco po `occurredAt`, następnie po `createdAt`, a na końcu po `id`.
