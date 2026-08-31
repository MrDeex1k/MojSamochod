# Bieżący stan projektu

Ten dokument jest roboczym podsumowaniem aktualnego stanu repozytorium. Nie zastępuje dokumentów
produktowych ani architektonicznych i powinien być aktualizowany albo usuwany po zakończeniu
opisywanego etapu.

## Stan ogólny

- Faza 0, czyli ustalenie zakresu produktu, modelu domenowego, pierwszego przepływu użytkownika i
  kierunku wizualnego, jest zakończona.
- Fundament aplikacji z fazy 1 został zintegrowany z `main`.
- Faza 2, czyli lokalna persystencja danych, została zintegrowana z `main`.
- Faza 3, czyli pierwszy kompletny przepływ pojazdu i historii, została zintegrowana z `main`.
- Faza 4, czyli dokumenty i faktury, jest zaimplementowana i zweryfikowana na branchu
  `feat/documents-and-invoices`.
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
- Przestrzeń pojazdu udostępnia listę dokumentów i faktur. Użytkownik może zaimportować plik PDF,
  JPEG albo PNG z systemowego selektora, nadać mu nazwę i opcjonalnie uzupełnić datę, kwotę,
  walutę, notatki oraz relację z jednym wpisem historii.
- Szczegóły dokumentu obsługują podgląd obrazu w aplikacji, natywny eksport PDF, edycję metadanych,
  zastąpienie pliku z zachowaniem tożsamości i relacji oraz trwałe usunięcie po potwierdzeniu.
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
- `expo-image` korzysta ze wspólnego adaptera NativeWind, dzięki czemu klasy wymiarów, proporcji i
  zaokrągleń są przekazywane do natywnego `style` również dla komponentu zewnętrznej biblioteki.
- Dostępne są wspólne stany: pusty, ładowania i błędu.
- Układ tabletu ma stałą kartę pojazdu po lewej oraz elastyczny obszar treści. Trzecia karta jest
  renderowana dopiero po przekazaniu szczegółów.
- Placeholder zdjęcia pojazdu w lewej karcie ma proporcje `1:1`: jego wysokość wynika z dostępnej
  szerokości karty.

### Testy i jakość

- Jest i React Native Testing Library są skonfigurowane dla aplikacji mobilnej.
- Testy są umieszczane obok kodu i sprawdzają zachowanie widoczne dla użytkownika przez role,
  etykiety oraz interakcje.
- Aktualny zestaw zawiera 33 zestawy i 132 testy komponentów, układu adaptacyjnego, inicjalizacji
  bazy, domeny, mapperów rekordów, repozytoriów, trwałości SQLite, eksportu, zarządzanych plików,
  dokumentów oraz lokalizacji.
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
- Końcowa weryfikacja Fazy 3 na tych samych czterech urządzeniach potwierdziła prawidłowe proporcje
  formularzy, zdjęcie `1:1` po wyborze z galerii oraz układy telefonu i tabletu. Na iPhonie wykonano
  pełny przepływ: ponowne uruchomienie z zachowaniem danych, dodanie trzech typów wpisów, szczegóły,
  wejście w edycję, odrzucenie zmian i potwierdzone usunięcie wpisu. Przepływ zdjęcia sprawdzono na
  obu systemach mobilnych z plikami testowymi dostarczonymi w katalogu roboczym.
- Końcowa weryfikacja Fazy 4 na iPhonie 15, iPadzie 10. generacji, Pixelu 9 i Pixel Tablet
  potwierdziła import z systemowego selektora, trwałość po przeładowaniu, listę i szczegóły w układzie
  telefonu oraz tabletu. Na iPhonie sprawdzono pełny przepływ PDF: import z metadanymi, relację ze
  wpisem, edycję, odrzucenie duplikatu SHA-256, zastąpienie obrazem, podgląd, czytelną nazwę w
  natywnym eksporcie i usunięcie.

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
- Eksport `moje-auto-vehicle-history` w wersji 2 tworzy czytelny JSON pojazdu, historii i metadanych
  dokumentów, także dla pustej bazy. Nie zawiera zdjęć ani plików binarnych; pole
  `binaryFilesIncluded` pozostaje równe `false`, a kontrakt ma osobną dokumentację kompatybilności.
- Kontrakt `ObjectStorage` rozdziela etapowanie, trwałe zatwierdzenie, odrzucenie, usunięcie i eksport
  obiektu. Metadane definiują rozmiar, SHA-256 i bezpieczny względny klucz magazynu, a dokumentacja
  opisuje odzyskiwanie po przerwaniu operacji między SQLite i systemem plików.
- Uzgadnianie przy starcie kończy oczekujące zapisy i usunięcia oraz usuwa osierocone pliki stagingu
  i niepowiązane zdjęcia lub dokumenty. Test ponownego otwarcia potwierdza trwałość relacji zdjęcia,
  dokumentu i wpisu historii.
- Migracja `0002_add_vehicle_documents.sql` dodaje metadane dokumentów i ich relacje, a
  `0003_enforce_document_sha256_uniqueness.sql` atomowo rezerwuje aktywną zawartość dokumentu po
  SHA-256. Pliki do 20 MB są przechowywane w prywatnym magazynie aplikacji, a SQLite przechowuje ich
  oryginalną nazwę, MIME, rozmiar, SHA-256, stan oraz klucz magazynowy.
- Duplikat zawartości jest wykrywany po SHA-256 i odrzucany bez tworzenia drugiej kopii. Zastąpienie
  zapisuje nową relację przed usunięciem poprzedniego pliku, a uzgadnianie startowe naprawia
  przerwane operacje.

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
- Systemowy ekran kadrowania zdjęcia w Expo Go na iOS pokazuje część tekstów po angielsku mimo
  polskiego locale symulatora. Lokalizację natywnych tekstów trzeba potwierdzić w docelowym buildzie,
  ponieważ interfejs Expo Go nie jest konfigurowany przez zasoby natywne aplikacji.

## Następny krok

Przygotować pull request zamykający Fazę 4. Po integracji z `main` rozpocząć Fazę 5 dotyczącą
tankowań i obliczania zużycia paliwa na osobnym branchu.
