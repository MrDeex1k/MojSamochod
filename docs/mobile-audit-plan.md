# Plan poprawek po audycie aplikacji mobilnej

Punktem odniesienia jest rewizja `97852a8`. Proponowany tytuł zmian w Conventional Commits to `fix(mobile): address data integrity and workspace performance issues`.

## 1. Bezpieczny reset danych

- Odłączyć ekran zarządzania danymi od ładowania historii, liczników i przypomnień. Zachować jawne potwierdzenie usunięcia.
- Przy potwierdzeniu zamknąć dostęp dla nowych operacji. Poza pulą śledzonych operacji odczekać przyjęte zapisy, wybór plików, odzyskiwanie magazynu i trwającą synchronizację powiadomień. Następnie zapisać trwały znacznik resetu.
- Wykonać usuwanie danych użytkownika, plików i własnych powiadomień jako wznawialne etapy. Błąd API powiadomień powinien pozostawić możliwość usunięcia prywatnych kopii i ponowienia pozostałej pracy. Przed udostępnieniem formularza nowego auta przywrócić obsługę zapisów.
- **Odbiór.** Test z zatrzymanym importem i równoczesnym resetem, restart po każdym etapie, awaria odczytu uprawnień i anulowania alertu, uszkodzony rekord historii oraz utworzenie nowego auta po udanym resecie. Sprawdzić rekordy, rzeczywiste pliki i znacznik.

## 2. Import i zastępowanie dokumentów

- Walidować długość przygotowanej kopii przed zmianą referencji. Odrzucić pusty plik i zachować poprzedni załącznik. Sprawdzać znany rozmiar przed kopiowaniem, a dla źródeł bez rozmiaru przerwać odczyt po przekroczeniu 20 MiB. Na iOS uwzględnić kopiowanie wykonywane przez sam selektor. Sprzątać prywatne kopie także po odrzuceniu i anulowaniu.
- Dopasować wyszukiwanie duplikatu po SHA-256 do indeksu oraz stanów pliku. Zachować ochronę przed równoczesnym importem tej samej treści.
- **Odbiór.** Przetestować 0 bajtów, dokładnie 20 MiB, limit przekroczony o bajt, nieznany rozmiar i duplikat. Po błędzie poprzedni dokument nadal się otwiera. Sprawdzić katalogi tymczasowe oraz plan rzeczywistego parametryzowanego zapytania SQLite.

## 3. Poprawność formularzy, przebiegu i powiązań

- Powiązać błędy domenowe z polami formularza historii, w tym z nazwą serwisu i opisem przeglądu. Na iOS uzależnić zapis dokumentu od zatwierdzenia otwartego selektora daty.
- Przy edycji przebiegu początkowego przyjąć jako aktualny większą z dotychczasowej wartości i nowego przebiegu początkowego. Uwzględnić brak jednej lub obu wartości.
- Ujednolicić wyszukiwanie wpisu z widoczną etykietą w języku aplikacji. Przy otwarciu szczegółów dokumentu pobierać brakujące powiązanie po identyfikatorze.
- **Odbiór.** Granice długości 120/121 i 200/201 znaków, zatwierdzenie i anulowanie daty, dopisanie i obniżenie początkowego przebiegu, wyszukiwanie etykiet PL/EN i bezpośredni link do dokumentu spoza pierwszej strony.

## 4. Koszt odczytów historii i tankowań

- Pobierać liczniki załączników dla nowej strony historii i scalać wyniki. Po dodaniu, przeniesieniu lub usunięciu załącznika odświeżać liczniki dotkniętych wpisów.
- Dostosować predykat kursora do indeksu z zachowaniem dotychczasowego porządku i stabilnego rozstrzygania remisów. Anulować nieaktualne wyszukiwanie między partiami.
- Zapamiętać podsumowanie spalania i przeliczać je po zmianach wpływających na wynik. Zachować poprawność po edycji i usunięciu dawnego tankowania.
- **Odbiór.** Dla 100 kolejnych stron po 50 wpisów bez mutacji pobrać liczniki dla łącznie 5000 ID. Porównać koszt pierwszej i głębokiej strony przy 10 000 rekordów z powtarzającymi się datami. Sprawdzić kompletność wyników, brak duplikatów i zgodność podsumowania z pełnym przeliczeniem. Zmierzyć płynność przewijania na urządzeniu.

## 5. Integracje natywne i dostępność

- Ograniczyć odświeżanie terminów do zmian dotyczących tej sekcji. Przygotowywać kanał i odczytywać stan uprawnień raz na serię alertów, zachowując obsługę błędów pojedynczego powiadomienia.
- Na Androidzie odzyskać wynik wyboru zdjęcia po odtworzeniu aktywności przed sprzątaniem cache. Powiązać wynik z formularzem, który rozpoczął operację.
- Udostępnić TalkBack tekst stron PDF tam, gdzie obsługiwana wersja Androida pozwala go odczytać. Zachować czytelną informację o stronie dla skanów.
- **Odbiór.** Przewijanie historii po odwiedzeniu terminów nie uruchamia dodatkowej synchronizacji. Sprawdzić serię alertów, cofnięcie zgody, wybór zdjęcia z opcją „Nie zachowuj aktywności” oraz odczyt faktury tekstowej i skanu z TalkBack.

## Weryfikacja wdrożenia

Na początku odtworzyć awarię testu introspekcji Expo z projektem iOS w formacie `project.xcproj`. Uruchamiać ten test na izolowanej kopii w zgodnym formacie i zachować asercje dotyczące uprawnień. W audycie ten przypadek odpowiadał za jeden błąd na 566 testów Jest. Osobno odnotowano problem formatowania lokalnego dokumentu publikacyjnego.

Przed implementacją każdego etapu sprawdzić odpowiednie API w Context7. Po zmianach uruchomić `nub run check`, po zmianach w React także React Doctor, a po zmianach zależności lub konfiguracji natywnej również Expo Doctor. Scenariusze użytkowe sprawdzić na iOS i Androidzie, uwzględniając iPada i tablet z Androidem dla ekranów adaptacyjnych.
