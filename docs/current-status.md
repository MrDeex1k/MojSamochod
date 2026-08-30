# Bieżący stan projektu

Ten dokument jest roboczym podsumowaniem aktualnego stanu repozytorium. Nie zastępuje dokumentów
produktowych ani architektonicznych i powinien być aktualizowany albo usuwany po zakończeniu
opisywanego etapu.

## Stan ogólny

- Faza 0, czyli ustalenie zakresu produktu, modelu domenowego, pierwszego przepływu użytkownika i
  kierunku wizualnego, jest zakończona.
- Fundament aplikacji z fazy 1 został zintegrowany z `main`.
- Faza 2, czyli lokalna persystencja danych, została zintegrowana z `main`.
- Implementacja Fazy 3 na branchu `feat/vehicle-history-slice` jest zakończona do etapu automatycznej
  weryfikacji. Przed zamknięciem fazy pozostaje test pełnego przepływu na czterech natywnych
  urządzeniach testowych.
- Aplikacja przy starcie otwiera lokalną bazę, wykonuje migracje, uzgadnia stan zarządzanych plików i
  kieruje użytkownika do utworzenia pierwszego pojazdu albo bezpośrednio do zapisanej historii.

## Zaimplementowany fundament

### Aplikacja i nawigacja

- Aplikacja korzysta z Expo Router i ma minimalne trasy dla dodawania pierwszego pojazdu oraz
  przestrzeni pojazdu.
- Onboarding zapisuje wymagane i opcjonalne dane pojazdu, licznik początkowy oraz opcjonalne zdjęcie
  wybrane wyłącznie z galerii. Limit jednego pojazdu jest egzekwowany przez repozytorium.
- Przestrzeń pojazdu pokazuje rzeczywiste dane, aktualny przebieg i chronologiczną historię. Obsługuje
  tworzenie, szczegóły, edycję i bezpieczne usuwanie przeglądów, wymian i napraw.
- Formularz wpisu ma osobne natywne kontrolki daty oraz godziny UTC, które zapisują jeden znacznik
  `occurredAt` z dokładnością do minuty. Po zapisie aplikacja wraca do historii.
- Główny layout zapewnia `SafeAreaProvider`, ciemny pasek stanu i wspólny import stylów.
- Telefon jest obecnie obsługiwany w pionie, a tablet w poziomie. Pozostałe układy pokazują
  komunikat proszący o obrócenie urządzenia.
- Tablet rozpoznawany jest na podstawie krótszego boku o długości co najmniej 600 punktów
  logicznych.

### Wygląd i komponenty

- Jedynym obsługiwanym wariantem jest Dark Mode z tłem `#121212`.
- Centralna paleta oraz semantyczne tokeny znajdują się w `apps/mobile/styles/theme.css`.
- Dostępne są podstawowe komponenty: `Button`, `Card`, `TextField` i przewijalny `Screen`
  uwzględniający safe area oraz klawiaturę.
- Dostępne są wspólne stany: pusty, ładowania i błędu.
- Układ tabletu ma stałą kartę pojazdu po lewej oraz elastyczny obszar treści. Trzecia karta jest
  renderowana dopiero po przekazaniu szczegółów.
- Placeholder zdjęcia pojazdu w lewej karcie ma proporcje `1:1`: jego wysokość wynika z dostępnej
  szerokości karty.

### Testy i jakość

- Jest i React Native Testing Library są skonfigurowane dla aplikacji mobilnej.
- Testy są umieszczane obok kodu i sprawdzają zachowanie widoczne dla użytkownika przez role,
  etykiety oraz interakcje.
- Aktualny zestaw zawiera 24 zestawy i 106 testów komponentów, układu adaptacyjnego, inicjalizacji
  bazy, domeny, mapperów rekordów, zachowania repozytoriów, trwałości SQLite, eksportu,
  zarządzanych plików oraz lokalizacji.
- `nub run check` uruchamia lint, kontrolę formatowania, TypeScript i testy; obecnie przechodzi.
- React Doctor 0.9.12 dla zmian na branchu kończy się wynikiem 96/100 bez wykrytych problemów.
- Natywne bundle'e z dołączoną migracją zostały poprawnie wygenerowane dla iOS i Androida.
- Po implementacji Fazy 3 bundle'e Hermes zostały ponownie poprawnie wygenerowane osobno dla iOS i
  Androida, wraz z nowymi modułami zdjęć, systemu plików i selektora daty oraz czasu.
- Pierwszy start bazy i ponowne uruchomienie z już zastosowaną migracją zostały sprawdzone natywnie
  na iPhonie 15, iPadzie 10. generacji, Pixelu 9 i Pixel Tablet. Na obu urządzeniach iOS potwierdzono
  również plik `moje_auto.db`, tryb WAL, komplet tabel i jeden rekord migracji.
- Fundament był sprawdzany natywnie na iPhonie 15, iPadzie 10. generacji, Pixelu 9 i Pixel Tablet.
  Ostatnia zmiana proporcji zdjęcia została dodatkowo sprawdzona na obu tabletach.

### Domena i persystencja

- Interfejsy repozytorium pojazdu i historii są oddzielone od Drizzle oraz zwracają typowane wyniki:
  konflikt, brak rekordu, uszkodzone dane, niedostępny magazyn albo nieobsługiwana operacja.
- Produkcyjna implementacja Drizzle zapewnia CRUD pojazdu oraz wpisów przeglądu, wymiany i naprawy.
- Utworzenie lub aktualizacja wpisu, jego szczegółów i ewentualne podniesienie aktualnego przebiegu
  odbywają się w jednej transakcji. Edycja i usunięcie wpisu nie obniżają przebiegu pojazdu.
- Rekordy odczytane z SQLite są ponownie sprawdzane względem kontraktu domenowego. Nieprawidłowy
  identyfikator, czas, kwota lub brak właściwego rekordu szczegółów daje błąd `corrupt-data` zamiast
  niepełnego modelu domenowego.
- Zdjęcia pojazdu są kadrowane do proporcji `1:1`, przetwarzane do JPEG, ograniczane do 2048 px i
  5 MB, a następnie przechowywane w prywatnym magazynie aplikacji. SQLite przechowuje wyłącznie
  metadane i stabilną relację z pojazdem.
- Deterministyczny fixture deweloperski zawiera pojazd oraz po jednym wpisie przeglądu, wymiany i
  naprawy. Nie jest importowany przez produkcyjny proces startu aplikacji.
- Testy na rzeczywistym pliku SQLite potwierdzają trwałość danych po zamknięciu i ponownym otwarciu,
  pełny rollback przerwanego zapisu oraz odrzucanie rekordów łamiących ograniczenia schematu.
- Błąd migracji zamyka połączenie i pozostaje błędem źródłowym również wtedy, gdy samo zamknięcie
  połączenia także się nie powiedzie.
- Eksport `moje-auto-vehicle-history` w wersji 1 tworzy czytelny JSON pojazdu i historii, także dla
  pustej bazy. Format jest niezależny od schematu Drizzle, nie zawiera zdjęć ani innych plików
  binarnych i ma osobną dokumentację kompatybilności.
- Kontrakt `ObjectStorage` rozdziela etapowanie, trwałe zatwierdzenie, odrzucenie, usunięcie i eksport
  obiektu. Metadane definiują rozmiar, SHA-256 i bezpieczny względny klucz magazynu, a dokumentacja
  opisuje odzyskiwanie po przerwaniu operacji między SQLite i systemem plików.
- Uzgadnianie przy starcie kończy oczekujące zapisy i usunięcia oraz usuwa osierocone pliki stagingu
  i niepowiązane zdjęcia. Test ponownego otwarcia potwierdza trwałość relacji zdjęcia i wpisu historii.

## Znane ograniczenia i dług techniczny

- Expo Doctor zgłasza dwa oczekiwane odstępstwa: nie rozpoznaje `nub.lock`, a TypeScript 7 jest
  świadomym wyborem projektu. Nie należy z tego powodu tworzyć innego lockfile'a ani obniżać
  TypeScriptu.
- Część stylów krytycznych dla natywnego układu tabletu używa obecnie `StyleSheet` i surowych
  wartości kolorów. Przed budową ekranów produkcyjnych należy przywrócić zasadę jednego źródła
  kolorów albo wyodrębnić współdzielone tokeny dostępne również dla `StyleSheet`.
- Interfejs korzysta z polskiego lub angielskiego katalogu na podstawie języka systemowego.
  Nieobsługiwane języki korzystają z angielskiego fallbacku.
- Web pozostaje wyłącznie możliwością deweloperską Expo i nie jest platformą testową ani docelową.

## Następny krok

Wykonać etap 8: natywny test pełnego przepływu na iPhonie, iPadzie, telefonie z Androidem i tablecie
z Androidem. Test ma objąć onboarding ze zdjęciem, ponowne uruchomienie, utworzenie wszystkich typów
wpisów, szczegóły, edycję, usunięcie oraz układy właściwe dla telefonu i tabletu.
