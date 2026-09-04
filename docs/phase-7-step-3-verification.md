# Faza 7 — krok 3: cykl życia i sytuacje awaryjne

Data: 2026-09-04. Branch: `feat/free-release-hardening`.

Krok wykonano na prośbę użytkownika przed krokiem 2. Nie oznaczało to wówczas wdrożenia resetu
danych ani usunięcia zewnętrznych akcji dokumentów; zakres ten uzupełniono później w kroku 2.
Krok 3 jest zaakceptowany. Nieodtworzony incydent inicjalizacji SQLite pozostaje zapisany jako
jeden znany, nieblokujący błąd, a nie jako potwierdzona poprawka.

## Poprawka i testy regresji

- Potwierdzono testem błąd przy braku miejsca: `ExpoFileSystemDriver` tworzył katalogi w konstruktorze,
  wywoływanym podczas tworzenia usług aplikacji. `ENOSPC` omijał wtedy obsługę błędów importu.
  Dwa nowe testy najpierw zakończyły się błędem, a po poprawce przeszły.
- Katalogi powstają teraz dopiero przy kopiowaniu do prywatnego magazynu, wewnątrz chronionej
  operacji `stage`. Odczyt nieistniejącego katalogu staging zwraca pustą listę bez zapisu na dysku.
  Nie zmieniono limitów plików, schematu bazy, uprawnień ani zależności.
- Regresje obejmują częściową kopię po błędzie miejsca, nieudaną próbę sprzątania i jej ponowienie,
  przerwanie importu podczas przenoszenia pliku oraz zapisu stanu `ready`. Odtworzony koordynator
  usuwa niedokończone, niepowiązane kopie; ponowienie uzgadniania jest bezpieczne.
- Testy providera pokrywają zakończenie inicjalizacji i błąd już po odmontowaniu oraz niezależność
  uchwytu kolejnego providera. Są to testy kontraktu React z podmienionymi uchwytami, nie reprodukcja
  natywnego incydentu SQLite.
- Test prawdziwego SQLite przez `node:sqlite` ogranicza rozmiar tymczasowej bazy za pomocą
  `PRAGMA max_page_count`. Wymuszony `SQLITE_FULL` wycofuje transakcję obejmującą zmianę pojazdu
  i metadane plików. Kontrola integralności przechodzi, a ponowne otwarcie pozwala zapisywać.
  To kontrolowany test silnika, nie fizyczne zapełnienie urządzenia. Zobacz
  [dokumentację PRAGMA](https://www.sqlite.org/pragma.html#pragma_max_page_count).

## Weryfikacja natywna

Własne, ponownie zbudowane aplikacje QA Release `dev.mojeauto.qa`, bez Metro i Expo Go.
Instalacja aktualizacyjna bez czyszczenia wcześniejszych danych testowych.

| Urządzenie                          | Próby                                                                                                                                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iPhone 17 Pro, iOS 26.5, PL         | Restart i zachowanie pojazdu; formularz dokumentu po powrocie z tła; komunikat dla poziomu i powrót do pionu; zamknięcie aplikacji przy otwartym pickerze i ponowny start bez nowego dokumentu. |
| iPad Air 11 M4, iPadOS 26.5, PL     | Restart z zachowaną historią; formularz po powrocie z tła; komunikat dla pionu i powrót do poziomu; restart z otwartym pickerem bez nowego dokumentu.                                           |
| Pixel 9, Android 17/API 37, EN      | Restart; powrót formularza z tła, również z wybranym PDF i nazwą; zapis testowej faktury; obrót do poziomu i powrót; sześć zmian skali 100% ↔ 150% na nowym buildzie.                           |
| Pixel Tablet, Android 17/API 37, EN | Restart z zachowanymi danymi; formularz po powrocie z tła; komunikat dla pionu i powrót do poziomu; restart z otwartym pickerem.                                                                |

Na Pixel Tablet naturalna orientacja jest pozioma: polecenie narzędzia `portrait` odpowiadało
obrotowi 0 i rzeczywistemu poziomowi, a `landscape-left` — obrotowi 1 i rzeczywistemu pionowi.
Wynik sprawdzono w UI, nie tylko po komunikacie narzędzia. Przywrócono rzeczywisty poziom tabletów,
pion telefonów i skalę tekstu Pixel 9 równą 1.0. Nie zmieniano strefy czasowej ani zegara.

## Incydent SQLite i granice akceptacji

Incydent opisany w [kroku 1](phase-7-step-1-verification.md) nie wystąpił ponownie:
seria zmian skali na poprzednim buildzie oraz sześć kontrolowanych zmian na nowym nie pokazały
ekranu błędu bazy. Ograniczone logi nie wskazały przyczyny. Przejrzano zarządzanie połączeniami
w zainstalowanym Expo SQLite: natywny cache używa licznika referencji. Nie dodano spekulacyjnej
zmiany sposobu otwierania bazy, automatycznego retry ani resetowania danych.

To nie jest dowód naprawy dawnego incydentu. Decyzją produktową pozostaje on jednym znanym,
nieblokującym błędem; ponowna reprodukcja z diagnostyką inicjalizacji może zostać wykonana poza
bieżącym krokiem. Testy awarii kopii i zapisu metadanych są deterministycznym
wstrzykiwaniem błędów; natywnie przerywano otwarty picker, nie proces dokładnie w trakcie kopiowania
bajtów. Nie wykonywano fizycznego zapełnienia dysku, wymuszonego ubicia przez system z powodu
braku RAM ani testów na fizycznych urządzeniach. Nie deklarujemy zachowania niezapisanych szkiców
po zabiciu procesu. Reset i jego przerwanie zweryfikowano osobno w kroku 2.

## Polecenia kontrolne

`nub run check`: PASS — 413 testów w 61 zestawach, lint, formatowanie, typy i kontrola migracji.
Ukierunkowane testy:

```sh
nub run --workspace @moje-auto/mobile test --runInBand infrastructure/storage
nub run --workspace @moje-auto/mobile test --runInBand application/storage/managed-file-coordinator.test.ts
nub run --workspace @moje-auto/mobile test --runInBand components/providers/database-provider.test.tsx
nub run --workspace @moje-auto/mobile test --runInBand infrastructure/database/sqlite-resilience.test.ts
```

React Doctor 0.9.13: 93/100, bez nowych błędów, pozostaje ostrzeżenie o złożoności workspace.
Expo Doctor: 19/21; znane nierozpoznawanie `nub.lock`, świadomy TypeScript 7 i nowsze patche Expo
opisane w raporcie kroku 1. Zależności pozostawiono bez zmian.

Po końcowym restarcie PDF zapisany na Pixel 9 pozostał na liście. Na Pixel Tablet zachowano
wcześniejszą fakturę; na urządzeniach Apple przerwanie pickera nie utworzyło dokumentów.
Zamknięto sesje testowe aplikacji. Nie usuwano oryginałów ani wcześniejszych danych użytkownika.
