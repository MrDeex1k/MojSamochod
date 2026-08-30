# Bieżący stan projektu

Ten dokument jest roboczym podsumowaniem aktualnego stanu repozytorium. Nie zastępuje dokumentów
produktowych ani architektonicznych i powinien być aktualizowany albo usuwany po zakończeniu
opisywanego etapu.

## Stan ogólny

- Faza 0, czyli ustalenie zakresu produktu, modelu domenowego, pierwszego przepływu użytkownika i
  kierunku wizualnego, jest zakończona.
- Fundament aplikacji z fazy 1 został zintegrowany z `main`.
- Faza 2, czyli lokalna persystencja danych, jest rozpoczęta na branchu
  `feat/local-persistence-foundation`.
- Aplikacja nadal pokazuje ekrany fundamentowe i placeholdery. Pierwszy schemat oraz migracja są
  gotowe, ale aplikacja nie otwiera jeszcze bazy i nie zapisuje pojazdu ani wpisów historii.

## Zaimplementowany fundament

### Aplikacja i nawigacja

- Aplikacja korzysta z Expo Router i ma minimalne trasy dla dodawania pierwszego pojazdu oraz
  przestrzeni pojazdu.
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
- Aktualny zestaw zawiera 4 zestawy i 15 testów komponentów oraz układu adaptacyjnego.
- `nub run check` uruchamia lint, kontrolę formatowania, TypeScript i testy; obecnie przechodzi.
- Fundament był sprawdzany natywnie na iPhonie 15, iPadzie 10. generacji, Pixelu 9 i Pixel Tablet.
  Ostatnia zmiana proporcji zdjęcia została dodatkowo sprawdzona na obu tabletach.

## Znane ograniczenia i dług techniczny

- React Doctor uruchamiany przez SFW nie kończy obecnie analizy. Jego tymczasowa instalacja wymaga
  `fastq@1.20.2`, które SFW blokuje jako obniżenie poziomu zaufania względem `fastq@1.20.0`.
  Zabezpieczenie nie zostało wyłączone ani ominięte.
- Expo Doctor zgłasza dwa oczekiwane odstępstwa: nie rozpoznaje `nub.lock`, a TypeScript 7 jest
  świadomym wyborem projektu. Nie należy z tego powodu tworzyć innego lockfile'a ani obniżać
  TypeScriptu.
- Część stylów krytycznych dla natywnego układu tabletu używa obecnie `StyleSheet` i surowych
  wartości kolorów. Przed budową ekranów produkcyjnych należy przywrócić zasadę jednego źródła
  kolorów albo wyodrębnić współdzielone tokeny dostępne również dla `StyleSheet`.
- Teksty widoczne na ekranach fundamentowych są wpisane bezpośrednio w komponentach. Biblioteka i18n
  nie została jeszcze wybrana; trzeba ją wprowadzić przed utrwaleniem produkcyjnych tekstów fazy 3.
- Web pozostaje wyłącznie możliwością deweloperską Expo i nie jest platformą testową ani docelową.

## Następny krok

1. Dodać inicjalizację bazy, wykonywanie migracji przy starcie oraz jawny stan błędu migracji.
2. Zaimplementować i przetestować lokalne CRUD dla pojazdu oraz wpisów historii bez wykonywania
   zapytań bazodanowych bezpośrednio w ekranach.
3. Dodać wersjonowany eksport JSON bez danych binarnych.
4. Zaprojektować kontrakt `ObjectStorage`, którego lokalna implementacja powstanie ze zdjęciami w
   Fazie 3.
