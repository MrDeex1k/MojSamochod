# Architektura lokalnej persystencji

## Status dokumentu

**Status:** zatwierdzony kierunek techniczny

**Faza realizacji:** Faza 2 — fundament lokalnej persystencji

Ten dokument jest roboczym opisem decyzji wdrożeniowych dla pierwszej wersji lokalnej bazy danych.
Uzupełnia model domenowy, ale nie zmienia zatwierdzonych reguł produktu.

## Stos technologiczny

- `expo-sqlite` zapewnia natywną, trwałą bazę SQLite na iOS, iPadOS oraz Androidzie.
- Drizzle ORM zapewnia typowany schemat, zapytania i mapowanie rekordów.
- Drizzle Kit generuje jawne migracje SQL, które są przeglądane i commitowane razem ze zmianą
  schematu.
- Ekrany nie importują klienta Drizzle. Dostęp do danych przechodzi przez przypadki użycia i
  interfejsy repozytoriów.
- Dokładne wersje pakietów zostaną wybrane przez sprawdzenie zgodności z Expo SDK 57 i zainstalowane
  przez NUB oraz SFW.

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

Nie powstają jeszcze puste tabele dokumentów, tankowań, przypomnień, subskrypcji ani synchronizacji.
Limit jednego bezpłatnego pojazdu jest egzekwowany przez przypadek użycia, a nie przez konstrukcję
schematu, aby późniejsze Premium nie wymagało przebudowy tożsamości danych.

## Migracje i transakcje

- Każda zmiana schematu otrzymuje wygenerowaną, wersjonowaną migrację SQL.
- Migracje są dołączane do aplikacji i wykonywane przed udostępnieniem edytowalnego interfejsu.
- Nieudana migracja prowadzi do jawnego stanu błędu i nie jest interpretowana jako brak danych.
- Utworzenie albo aktualizacja wpisu wraz ze zmianą aktualnego przebiegu pojazdu jest jedną
  transakcją.
- Usuwanie jest trwałe. Wpisy pojazdu mogą korzystać z relacji `ON DELETE CASCADE`, ale usunięcie
  agregatu pozostaje jawnym przypadkiem użycia.

## Zarządzane pliki i ObjectStorage

Zdjęcia oraz dokumenty nie będą przechowywane jako BLOB-y w SQLite. Docelowa konstrukcja rozdziela:

- binarną zawartość w zarządzanym katalogu aplikacji;
- metadane i relacje w SQLite;
- operacje na plikach za interfejsem `ObjectStorage`.

Metadane zarządzanego pliku będą obejmować co najmniej stabilny `ManagedFileId`, klucz magazynowy,
rodzaj, MIME type, oryginalną nazwę, rozmiar, sumę SHA-256 oraz znaczniki czasu. Pojazd lub dokument
odwołuje się do stabilnego identyfikatora, a nie do ścieżki źródłowej użytkownika.

W Fazie 2 definiujemy kontrakt `ObjectStorage` i granicę transakcji między metadanymi a plikiem, ale
nie implementujemy jeszcze importu danych binarnych. Lokalna implementacja powstanie w Fazie 3 wraz
ze zdjęciem pojazdu. Ta sama granica może w przyszłości otrzymać inną implementację, ale obecny
zakres nie wprowadza S3, Cloudflare R2 ani innej chmury.

## Eksport

Faza 2 dostarcza wersjonowany, eksportowalny JSON zawierający pojazd i historię. Nie zawiera on
plików binarnych. Po wdrożeniu zdjęć i dokumentów format eksportu zostanie rozszerzony do archiwum z
manifestem JSON oraz katalogiem obiektów, bez umieszczania binarnej zawartości w bazie SQLite.

## Granice implementacji

- Drizzle jest szczegółem infrastruktury, a nie typem domenowym.
- Repozytoria zwracają modele domenowe i typowane błędy.
- UUIDv7 generuje dedykowany `IdGenerator`, dzięki czemu testy mogą używać deterministycznych
  identyfikatorów.
- Zegar jest wstrzykiwany przez interfejs, aby walidacja przyszłego `occurredAt` i metadanych czasu
  była deterministyczna w testach.
- Zapytania historii sortują malejąco po `occurredAt`, następnie po `createdAt`, a na końcu po `id`.
