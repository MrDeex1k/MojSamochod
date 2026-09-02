# Model domenowy historii pojazdu

## Status dokumentu

**Status:** zatwierdzony model domenowy

**Faza realizacji:** Faza 0 — decyzje produktowe i domenowe

**Status implementacji:** modele, typy wartości i walidacja zaimplementowane; przypadki użycia oraz
repozytoria pozostają w realizacji

Ten dokument definiuje pierwszy model domenowy bezpłatnego, lokalnego przepływu historii pojazdu.
Przekłada uzgodniony zakres produktu na jednoznaczne dane, reguły walidacji i cykl życia, zanim
zostanie wybrana baza danych lub interfejs użytkownika.

Decyzje wymienione w sekcji [Zatwierdzone decyzje produktowe](#zatwierdzone-decyzje-produktowe)
stanowią bazowy model Fazy 0. Późniejsza implementacja nie może po cichu zmieniać zatwierdzonej
reguły — dokument i implementacja muszą zmieniać się razem.

## Zakres

Model obejmuje pierwszy kompletny przekrój funkcjonalny:

1. Utworzenie jednego pojazdu z wymaganą pojemnością zbiornika, opcjonalnym licznikiem początkowym
   i jednym opcjonalnym zdjęciem.
2. Wyświetlenie jego aktualnego przebiegu i chronologicznej historii.
3. Dodanie wpisu przeglądu, wymiany lub naprawy.
4. Wyświetlenie, edycję i bezpieczne usunięcie wpisu.
5. Zachowanie pojazdu i jego wpisów po ponownym uruchomieniu aplikacji.

Definiuje również typy wartości, które w kolejnych fazach zostaną wykorzystane przez dokumenty,
tankowania, przypomnienia, pojazdy Premium, eksport oraz synchronizację.

Celowo odłożone zostają:

- tabele bazy danych, indeksy oraz wybór mechanizmu migracji;
- dokładne wersje zatwierdzonych bibliotek persystencji;
- szczegóły cyklu życia plików dokumentów poza zachowaniem przy usuwaniu wpisu;
- reguły obliczania zużycia paliwa;
- planowanie powiadomień;
- uprawnienia subskrypcyjne i konflikty synchronizacji.

## Słownik domenowy

| Pojęcie              | Znaczenie                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| Pojazd               | Samochód, którego tożsamością, aktualnym przebiegiem i praktyczną historią zarządza użytkownik.            |
| Historia pojazdu     | Wszystkie datowane wpisy przeglądów, wymian i napraw należące do pojazdu.                                  |
| Wpis historii        | Jedno datowane zdarzenie zapisane dla pojazdu.                                                             |
| Przegląd             | Badanie obowiązkowe, diagnostyczne lub inna kontrola wraz z jej wynikiem.                                  |
| Wymiana              | Wymiana materiału eksploatacyjnego, części, płynu lub innego elementu.                                     |
| Naprawa              | Praca wykonana w celu zdiagnozowania albo usunięcia usterki lub uszkodzenia.                               |
| Licznik początkowy   | Opcjonalny odczyt podany podczas dodawania pojazdu; opisuje stan, od którego użytkownik zaczyna ewidencję. |
| Aktualny przebieg    | Ostatni jawnie zaakceptowany odczyt: początkowy albo podany przy późniejszym wpisie historii.              |
| Przebieg wpisu       | Opcjonalny bieżący odczyt podany przy zdarzeniu zapisanym we wpisie historii.                              |
| Koszt                | Opcjonalna kwota zapłacona lub przypisana do wpisu historii.                                               |
| Zarządzany dokument  | Plik skopiowany do pamięci aplikacji i wskazywany przez metadane domenowe w późniejszej fazie.             |
| Bezpieczne usunięcie | Jawna, potwierdzona operacja o zdefiniowanym zachowaniu dla powiązanych rekordów i zarządzanych plików.    |

## Podstawowe konwencje

### Stabilne identyfikatory

- Każdy utrwalany agregat i encja otrzymuje nieprzezroczysty, globalnie unikalny identyfikator w
  chwili utworzenia.
- Identyfikatory nie kodują numeru wiersza bazy danych, danych pojazdu ani etykiety widocznej dla
  użytkownika.
- Identyfikator nie zmienia się przy edycji, eksporcie, imporcie ani synchronizacji rekordu.
- Implementacja używa UUIDv7, ale interfejsy domenowe udostępniają typowane wartości `VehicleId`,
  `HistoryEntryId` i `DocumentId`, a nie surowe ciągi znaków.
- Część czasowa UUIDv7 nie jest źródłem czasu domenowego. Kod nie odczytuje z identyfikatora momentu
  utworzenia, czasu zdarzenia ani kolejności historii; służą do tego osobne pola.

Globalnie unikalne identyfikatory są wymagane od pierwszego schematu, aby późniejszy eksport, import
i synchronizacja między urządzeniami nie wymagały przepisywania tożsamości rekordów.

### Tekst

- Tekst wpisany przez użytkownika jest przechowywany w Unicode bez zmiany widocznej wielkości liter.
- Początkowe i końcowe białe znaki są usuwane przy zatwierdzaniu.
- Wartość zawierająca wyłącznie białe znaki jest traktowana jako pusta.
- Powtarzające się białe znaki wewnątrz tekstu oraz podziały wierszy w notatkach są zachowywane.
- Normalizacja na potrzeby wyszukiwania jest zagadnieniem indeksu i nie może nadpisywać oryginalnej
  wartości.
- Początkowe limity długości są regułami domenowymi, a nie wyłącznie atrybutami `maxLength` w UI.

### Daty kalendarzowe i znaczniki czasu

- Zdarzenie historii pojazdu używa wymaganego znacznika czasu `occurredAt` w UTC. Jest zapisywany w
  jednym polu jako tekst ISO 8601, na przykład `2026-08-30T14:30:00.000Z`.
- Formularz pokazuje osobne kontrolki `Data` i `Godzina` bez technicznego sufiksu w etykiecie, ale
  warstwa aplikacyjna interpretuje je w UTC i łączy w jedno `occurredAt`. Użytkownik wybiera czas z
  dokładnością do minuty, a sekundy i milisekundy są zapisywane jako zero.
- Terminy również używają dat kalendarzowych; ich późniejszy harmonogram powiadomień może dodatkowo
  przechowywać strefę czasową i lokalną godzinę powiadomienia.
- Metadane rekordu używają znaczników czasu UTC w polach `createdAt` i `updatedAt`.
- UUIDv7 nie zastępuje żadnego z tych pól czasu i nie jest używany do ustalania ich wartości.
- Historia jest sortowana przede wszystkim według `occurredAt`.
- Czas zdarzenia w przyszłości względem bieżącego czasu UTC jest odrzucany. Planowanie
  przyszłego serwisu należy do przypomnień, a nie do zakończonej historii pojazdu.

### Odległość i wskazania drogomierza

- Domena przechowuje znormalizowaną odległość jako nieujemną, całkowitą liczbę metrów.
- Interfejs przyjmuje i wyświetla kilometry lub mile zgodnie z preferencją jednostki danego pojazdu.
- Konwersja odbywa się na granicy warstwy aplikacyjnej przy użyciu jednej zdefiniowanej reguły
  zaokrąglania. Utrwalone obliczenia domenowe nigdy nie używają kilometrów ani mil zapisanych jako
  binarne liczby zmiennoprzecinkowe.
- Wskazanie drogomierza nie może być ujemne ani przekraczać udokumentowanego bezpiecznego limitu
  liczby całkowitej wybranej implementacji.
- Początkowo UI może przyjmować całe kilometry lub mile. Ułamkowe wskazania pozostają poza pierwszym
  przekrojem, o ile testy na urządzeniach nie wykażą rzeczywistej potrzeby.

Przechowywanie metrów daje domenie jedną jednostkę, a jednocześnie pozwala później zmienić jednostkę
wyświetlania bez przepisywania wszystkich wpisów historii.

### Pieniądze

`Money` składa się z:

| Pole         | Reguła                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `minorUnits` | Nieujemna bezpieczna liczba całkowita; wartości pieniężne typu zmiennoprzecinkowego są zabronione. |
| `currency`   | Literowy kod ISO 4217 zapisany razem z kwotą, na przykład `PLN`, `EUR` albo `USD`.                 |

- Zero jest prawidłowo zapisanym kosztem i różni się od braku podanego kosztu.
- Jeden wpis historii ma najwyżej jeden łączny koszt w pierwszym przekroju.
- Zmiana preferowanej waluty aplikacji nie przelicza kwot historycznych.
- Sumowane są wyłącznie kwoty w tej samej walucie. Automatyczne przeliczanie walut pozostaje poza
  MVP.
- Formatowanie i liczba miejsc dziesiętnych zależą od waluty i ustawień regionalnych na granicy
  warstwy prezentacji.

## Agregat pojazdu

Pojazd jest korzeniem agregatu pierwszego przekroju funkcjonalnego. Wpis historii nie może istnieć
bez pojazdu.

### Pola pojazdu

| Pole                            | Wymagane  | Reguła                                                                                                  |
| ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `id`                            | Systemowo | Stabilny `VehicleId`.                                                                                   |
| `make`                          | Tak       | Tekst po usunięciu skrajnych białych znaków, 1–80 znaków.                                               |
| `model`                         | Tak       | Tekst po usunięciu skrajnych białych znaków, 1–80 znaków.                                               |
| `variant`                       | Nie       | Tekst o długości najwyżej 100 znaków.                                                                   |
| `manufactureYear`               | Nie       | Czterocyfrowy rok, nie późniejszy niż bieżący rok kalendarzowy plus jeden.                              |
| `registrationNumber`            | Nie       | Tekst o długości najwyżej 20 znaków; przechowywany w postaci wpisanej.                                  |
| `vin`                           | Nie       | Po normalizacji wielkimi literami dokładnie 17 prawidłowych znaków VIN.                                 |
| `initialOdometerMetres`         | Nie       | Opcjonalny nieujemny odczyt podany podczas tworzenia pojazdu.                                           |
| `currentOdometerMetres`         | Nie       | Ostatni zaakceptowany odczyt; początkowo równy licznikowi początkowemu albo pusty.                      |
| `distanceUnitPreference`        | Tak       | `kilometres` albo `miles`; wartość początkowa z ustawień regionalnych, edytowalna.                      |
| `fuelTankCapacityMicrolitres`   | Tak       | Dodatnia pojemność zbiornika paliwa przechowywana w mikrolitrach; formularz przyjmuje liczbę całkowitą. |
| `fuelVolumeUnitPreference`      | Tak       | `litres`, `usGallons` albo `imperialGallons`; jawna i edytowalna.                                       |
| `fuelConsumptionUnitPreference` | Tak       | `litresPer100Kilometres`, `milesPerUsGallon` albo `milesPerImperialGallon`.                             |
| `photoReference`                | Nie       | Stabilne odwołanie do najwyżej jednego zdjęcia zarządzanego przez aplikację.                            |
| `createdAt`                     | Systemowo | Znacznik czasu utworzenia w UTC.                                                                        |
| `updatedAt`                     | Systemowo | Znacznik czasu ostatniej utrwalonej zmiany w UTC.                                                       |

Widoczna dla użytkownika nazwa pojazdu jest wyprowadzana z pól `make`, `model` i opcjonalnie
`variant`. Nie jest przechowywana osobno w pierwszym modelu, ponieważ druga edytowalna nazwa mogłaby
stać się niespójna z polami identyfikującymi pojazd.

Terminy ubezpieczenia i badania technicznego zdefiniowane w MVP zostaną dodane w Fazie 6. Ich
późniejsze dodanie nie może wymagać zmiany reguł tożsamości ani przebiegu pojazdu.

### Niezmienniki pojazdu

1. Bezpłatna aplikacja może zawierać najwyżej jeden aktywny pojazd.
2. Limit jest egzekwowany w przypadku użycia warstwy aplikacyjnej lub domenowej, a nie wyłącznie
   przez ukrycie przycisku dodawania.
3. Nowy pojazd zawsze ma markę, model, pojemność zbiornika oraz preferencje jednostki odległości,
   objętości i prezentacji spalania. Licznik początkowy i aktualny przebieg mogą pozostać nieznane,
   dopóki użytkownik nie poda pierwszego odczytu.
4. `initialOdometerMetres` zapisuje wyłącznie odczyt podany przy dodawaniu pojazdu. Jest punktem
   rozpoczęcia ewidencji i nie jest nadpisywany przez kolejne wpisy historii.
5. `currentOdometerMetres` jest ostatnią jawnie zaakceptowaną wartością. Przy tworzeniu pojazdu
   przyjmuje wartość licznika początkowego, jeżeli ją podano. Nie jest obliczany jako najwyższy odczyt
   z całej historii, ponieważ historia może być niepełna albo wprowadzana poza kolejnością.
6. Użytkownik nie edytuje `currentOdometerMetres` bezpośrednio w formularzu pojazdu. Wartość jest
   inicjalizowana licznikiem początkowym i aktualizowana odczytami podawanymi przy wpisach historii.
7. Pojazd ma najwyżej jedno zdjęcie. Użytkownik może wybrać je podczas tworzenia pojazdu, a później
   bezpiecznie zastąpić lub usunąć bez zmiany tożsamości pojazdu.
8. Zmiana preferencji jednostki nie przepisuje zapisanych odległości, ilości paliwa ani pojemności
   zbiornika. Wszystkie wartości prezentacyjne i wartości otwierane do edycji są ponownie
   przeliczane z jednostek kanonicznych.
9. Numer rejestracyjny i VIN są identyfikatorami podanymi przez użytkownika, a nie tożsamością
   rekordu.
10. Powielone numery rejestracyjne lub VIN nie mają znaczenia przy obsłudze jednego pojazdu. Przed
    wdrożeniem wielu pojazdów trzeba ustalić reguły unikalności i obsługę nieznanych wartości.
11. `currentOdometerMetres` jest monotoniczny. Korekta albo usunięcie historycznego wpisu nie obniża
    go automatycznie, ponieważ historia może być niepełna i nie stanowi źródła do ponownego
    wyprowadzania bieżącego odczytu. Świadome cofnięcie lub korekta drogomierza wymaga osobnego
    przepływu domenowego.
12. Migracja starszego pojazdu nie przypisuje domyślnej, zmyślonej pojemności zbiornika. Taki rekord
    pozostaje możliwy do odczytania, ale wymaga uzupełnienia pojemności przed pierwszym tankowaniem.

## Encja wpisu historii

Każdy wpis historii ma pola wspólne oraz jeden obiekt szczegółów zależny od typu. Unia
dyskryminowana musi uniemożliwić przypadkowe przechowywanie pól wymiany lub naprawy we wpisie
przeglądu.

### Pola wspólne

| Pole              | Wymagane  | Reguła                                                               |
| ----------------- | --------- | -------------------------------------------------------------------- |
| `id`              | Systemowo | Stabilny `HistoryEntryId`.                                           |
| `vehicleId`       | Systemowo | Identyfikator pojazdu będącego właścicielem wpisu.                   |
| `type`            | Tak       | `inspection`, `replacement` albo `repair`; niezmienne po utworzeniu. |
| `occurredAt`      | Tak       | Znacznik czasu zdarzenia UTC, który nie przypada w przyszłości.      |
| `odometerMetres`  | Nie       | Bieżący nieujemny odczyt podany przez użytkownika przy wpisie.       |
| `cost`            | Nie       | Jedna wartość `Money` reprezentująca koszt całkowity.                |
| `serviceProvider` | Nie       | Nazwa warsztatu, stacji lub usługodawcy; najwyżej 120 znaków.        |
| `notes`           | Nie       | Swobodny opis o długości najwyżej 5000 znaków.                       |
| `createdAt`       | Systemowo | Znacznik czasu utworzenia w UTC.                                     |
| `updatedAt`       | Systemowo | Znacznik czasu ostatniej utrwalonej zmiany w UTC.                    |

Typ wpisu jest niezmienny, ponieważ jego zmiana może po cichu usunąć informacje charakterystyczne
dla poprzedniego typu. Jeżeli użytkownik wybierze niewłaściwy typ, początkowa ścieżka naprawy polega
na utworzeniu prawidłowego wpisu i usunięciu błędnego po potwierdzeniu. Jawna funkcja konwersji może
zostać dodana w przyszłości tylko wtedy, gdy rzeczywiste użycie uzasadni jej koszt.

### Szczegóły przeglądu

| Pole          | Wymagane | Reguła                                                              |
| ------------- | -------- | ------------------------------------------------------------------- |
| `kind`        | Tak      | `technical`, `diagnostic` albo `other`.                             |
| `result`      | Tak      | `passed`, `failed`, `conditional` albo `not-recorded`.              |
| `description` | Nie      | Zakres kontroli lub dodatkowy kontekst wyniku; najwyżej 200 znaków. |

Termin kolejnego przeglądu nie jest przechowywany wewnątrz zakończonego wpisu historii w pierwszym
przekroju. Faza 6 może pozwolić utworzyć lub zaktualizować przypomnienie pojazdu na podstawie
przeglądu, nie czyniąc tych rekordów tym samym obiektem.

### Szczegóły wymiany

| Pole           | Wymagane | Reguła                                                            |
| -------------- | -------- | ----------------------------------------------------------------- |
| `item`         | Tak      | Wymieniona część, płyn lub materiał eksploatacyjny; 1–120 znaków. |
| `manufacturer` | Nie      | Producent części lub materiału; najwyżej 100 znaków.              |
| `partNumber`   | Nie      | Widoczne dla użytkownika oznaczenie części; najwyżej 100 znaków.  |

Ilość, cena jednostkowa oraz pojęcia magazynowe pozostają poza pierwszym przekrojem. Wspólne pole
`cost` jest całkowitą kwotą powiązaną ze zdarzeniem wymiany.

### Szczegóły naprawy

| Pole          | Wymagane | Reguła                                               |
| ------------- | -------- | ---------------------------------------------------- |
| `subject`     | Tak      | Usterka, układ albo naprawiany obszar; 1–120 znaków. |
| `description` | Nie      | Zwięzły opis wykonanej pracy; najwyżej 500 znaków.   |

Kody diagnostyczne, pozycje robocizny i części, gwarancje oraz fakturowanie warsztatowe pozostają
poza pierwszym przekrojem. Do czasu, aż dane produktowe uzasadnią pola strukturalne, informacje te
mogą być zapisywane w notatkach i dokumentach.

### Niezmienniki historii

1. Wpis zawsze należy do dokładnie jednego istniejącego pojazdu.
2. Muszą być obecne co najmniej wymagane pole zależne od typu oraz `occurredAt`.
3. Wpisy można tworzyć i edytować poza kolejnością chronologiczną.
4. Przebieg wpisu niższy niż aktualny przebieg pojazdu jest prawidłowy dla danych historycznych.
5. Jeżeli aktualny przebieg pojazdu jest nieznany albo przebieg wpisu jest od niego wyższy, zapis
   wpisu aktualizuje również aktualny przebieg po poinformowaniu użytkownika w formularzu.
6. Edycja ani usunięcie wpisu nigdy nie obniżają automatycznie aktualnego przebiegu pojazdu.
7. Odczyt niespójny z sąsiednimi wpisami według czasu zdarzenia powoduje możliwe do zignorowania
   ostrzeżenie, a nie błąd blokujący. Wymiana, przekręcenie i korekta drogomierza wymagają
   późniejszego, jawnego modelu.
8. Historia jest sortowana malejąco według `occurredAt`, następnie malejąco według `createdAt`, a na
   końcu według stabilnego `id`, aby zagwarantować deterministyczny wynik.
9. Koszt nie jest wymagany i nie wpływa na prawidłowość wpisu.

## Granica zdjęcia pojazdu

- Zdjęcie pojazdu jest opcjonalne i użytkownik może dodać je już podczas tworzenia pojazdu.
- Jeden pojazd ma najwyżej jedno aktywne zdjęcie.
- Wybrany obraz jest kopiowany do pamięci zarządzanej przez aplikację; encja pojazdu przechowuje
  wyłącznie stabilne `photoReference`, a nie ścieżkę źródłową użytkownika.
- Nieudane skopiowanie zdjęcia nie może utworzyć uszkodzonego odwołania ani utracić danych
  formularza. Użytkownik może ponowić operację albo kontynuować bez zdjęcia.
- Zastąpienie zdjęcia usuwa poprzedni zarządzany plik dopiero po pomyślnym zapisaniu nowego.
- Usunięcie pojazdu usuwa także zarządzany plik jego zdjęcia.
- Zdjęcie pojazdu nie jest dokumentem serwisowym i nie uczestniczy w relacjach dokumentów z wpisami
  historii.

## Granica dokumentów

Dokument jest encją należącą do pojazdu. Binarny plik jest osobnym zarządzanym obiektem, a encja
dokumentu przechowuje wyłącznie stabilne odwołanie i metadane użytkownika.

| Pole             | Wymagane  | Reguła                                                                |
| ---------------- | --------- | --------------------------------------------------------------------- |
| `id`             | Systemowo | Stabilny `DocumentId`.                                                |
| `vehicleId`      | Systemowo | Pojazd będący właścicielem dokumentu.                                 |
| `historyEntryId` | Nie       | Najwyżej jeden wpis historii należący do tego samego pojazdu.         |
| `fileReference`  | Systemowo | Stabilny identyfikator gotowego zarządzanego pliku.                   |
| `name`           | Tak       | Edytowalna nazwa po usunięciu skrajnych białych znaków, 1–255 znaków. |
| `documentDate`   | Nie       | Prawidłowa data kalendarzowa `YYYY-MM-DD`.                            |
| `amount`         | Nie       | Jedna wartość `Money`; zero różni się od braku kwoty.                 |
| `notes`          | Nie       | Tekst o długości najwyżej 5000 znaków.                                |
| `createdAt`      | Systemowo | Znacznik czasu utworzenia w UTC.                                      |
| `updatedAt`      | Systemowo | Znacznik czasu ostatniej utrwalonej zmiany w UTC.                     |

Zarządzany plik dokumentu zapisuje oryginalną nazwę, MIME, rozmiar, SHA-256, stan i bezpieczny
klucz magazynowy. Obsługiwane są PDF, JPEG i PNG o rozmiarze najwyżej 20 MB, wybierane przez
systemowy selektor plików.

Reguły relacji i cyklu życia:

- Zarządzany dokument należy do jednego pojazdu.
- Może dodatkowo wskazywać jeden wpis historii należący do tego samego pojazdu.
- Dokument nie może wskazywać wpisu innego pojazdu.
- Usunięcie wpisu historii usuwa wyłącznie jego relację z dokumentem. Dokument pozostaje przypisany
  do pojazdu i nie jest usuwany automatycznie.
- Usunięcie dokumentu nie usuwa jego pojazdu ani wpisu historii.
- Usunięcie pojazdu usuwa jego historię i zarządzane dokumenty poprzez jawną, odtwarzalną operację
  na pamięci.
- Ta sama zawartość nie jest importowana drugi raz: gotowy dokument z identycznym SHA-256 powoduje
  konflikt, który interfejs wyjaśnia użytkownikowi.
- Zastąpienie pliku zachowuje `DocumentId`, metadane użytkownika i relacje. Poprzedni plik jest
  usuwany dopiero po utrwaleniu nowego odwołania.
- Usunięcie dokumentu wymaga potwierdzenia i usuwa zarówno metadane, jak i zarządzany plik.
- Obraz jest podglądany w aplikacji. PDF jest przekazywany do natywnej powierzchni systemowej z
  czytelną nazwą pliku i możliwością eksportu.

Ścieżka pliku nie może pojawiać się bezpośrednio w encji domenowej `Vehicle` ani `HistoryEntry`.
Granice repozytorium i pamięci dokumentów rozwiązują stabilne odwołanie do dokumentu na plik w
pamięci zarządzanej przez aplikację.

## Cykl życia i reguły usuwania

### Wpis historii

- Edycja zachowuje identyfikator wpisu i pierwotne `createdAt`.
- Usunięcie wymaga potwierdzenia identyfikującego datę, typ i główny przedmiot wpisu.
- Usunięcie jest trwałe w MVP; nie ma ukrytego archiwum ani kosza.
- Powiązane zarządzane dokumenty pozostają dokumentami pojazdu i tracą wyłącznie relację z wpisem.
- Usunięcie wpisu nie przelicza ani nie obniża aktualnego przebiegu pojazdu.

### Pojazd

- Usunięcie pojazdu jest dostępne w zarządzaniu danymi lub ustawieniach pojazdu, a nie obok
  rutynowych działań.
- Potwierdzenie wyjaśnia, że historia i lokalnie zarządzane pliki również zostaną usunięte.
- Przed potwierdzeniem użytkownik otrzymuje możliwość eksportu danych, ale eksport nie jest
  obowiązkowy.
- Z perspektywy użytkownika usunięcie jest transakcyjne: częściowa operacja musi zostać wykryta i
  wznowiona albo wycofana, zamiast pozostawić niewidoczne rekordy lub osierocone pliki.
- W MVP z jednym pojazdem nie ma stanu archiwalnego.
- Po usunięciu aplikacja wraca do konfiguracji pierwszego pojazdu.

Dokładna strategia transakcji bazy danych i plików jest decyzją implementacyjną Fazy 2 oraz Fazy 4.
Przed wydaniem funkcji usuwania musi spełniać opisane powyżej obserwowalne reguły.

## Przypadki użycia warstwy aplikacyjnej

Kod prezentacji powinien wywoływać przypadki użycia, a nie bezpośrednio repozytoria.

| Przypadek użycia      | Odpowiedzialność                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `CreateVehicle`       | Walidacja tożsamości, pojemności zbiornika, jednostek, opcjonalnego licznika i zdjęcia, egzekwowanie limitu oraz zapis.   |
| `GetVehicleWorkspace` | Zwrócenie pojazdu oraz deterministycznej strony jego historii.                                                            |
| `UpdateVehicle`       | Walidacja edytowalnej tożsamości, jednostki, licznika początkowego i zdjęcia; aktualny przebieg zmieniają wpisy historii. |
| `DeleteVehicle`       | Potwierdzenie zamiaru i koordynacja usunięcia agregatu oraz zarządzanych plików.                                          |
| `CreateHistoryEntry`  | Walidacja wpisu dyskryminowanego i aktualizacja przebiegu, gdy jest potrzebna.                                            |
| `GetHistoryEntry`     | Zwrócenie wpisu tylko wtedy, gdy należy do wskazanego pojazdu.                                                            |
| `UpdateHistoryEntry`  | Zachowanie tożsamości i typu podczas walidacji edytowalnych wartości.                                                     |
| `DeleteHistoryEntry`  | Usunięcie wpisu i odłączenie powiązanych dokumentów bez ich usuwania.                                                     |
| `ImportDocument`      | Walidacja typu i rozmiaru, import pliku, wykrycie duplikatu oraz zapis metadanych i relacji.                              |
| `UpdateDocument`      | Edycja nazwy, daty, kwoty, notatek i opcjonalnej relacji bez zmiany tożsamości dokumentu.                                 |
| `ReplaceDocumentFile` | Bezpieczna wymiana binarnego pliku z zachowaniem dokumentu i usunięciem starego obiektu po zapisie.                       |
| `DeleteDocument`      | Koordynacja trwałego usunięcia metadanych i zarządzanego pliku po potwierdzeniu.                                          |

Wyniki przypadków użycia rozróżniają błędy walidacji, brakujące rekordy, awarie pamięci oraz
konflikty. Wyjątek pamięci nie może być przedstawiany jako nieprawidłowe dane użytkownika.

## Kryteria akceptacji pierwszego przekroju

Pierwszy przekrój UI, domena i fundament persystencji są ukończone. Poniższe zachowania są objęte
testami automatycznymi:

1. Prawidłowy pojazd jest tworzony ze stabilnym identyfikatorem i zachowany po ponownym
   zainicjalizowaniu repozytorium.
2. Drugi bezpłatny pojazd jest odrzucany na granicy przypadku użycia.
3. Wymagane pola pojazdu, VIN, rok, odległość, limity tekstu, pieniądze i znaczniki czasu są
   walidowane bez cichego zmieniania prawidłowych danych.
4. Pojazd wymaga dodatniej pojemności zbiornika, ale można go utworzyć bez licznika początkowego;
   podany licznik początkowy inicjalizuje aktualny przebieg bez utraty własnej wartości historycznej.
5. Pojazd można utworzyć bez zdjęcia albo z dokładnie jednym zdjęciem, które pozostaje dostępne po
   ponownym uruchomieniu aplikacji.
6. Każdy typ wpisu przyjmuje własne prawidłowe szczegóły i odrzuca szczegóły innego typu.
7. Można zapisać wpisy historyczne z niższym przebiegiem.
8. Pierwszy podany przebieg wpisu lub wyższy przebieg wpisu aktualizuje bieżący przebieg pojazdu w
   ramach tej samej pomyślnej operacji.
9. Edycja ani usunięcie wpisu nie obniżają bieżącego przebiegu.
10. Wpisy z tym samym `occurredAt` mają deterministyczną kolejność.
11. Wartości pieniężne przechodzą zapis i odczyt dokładnie w najmniejszych jednostkach oraz zachowują
    walutę.
12. Usunięcie wpisu odłącza powiązane dokumenty bez usuwania zarządzanych plików.
13. Nieudany zapis repozytorium nie pozostawia częściowego wpisu ani nieprawidłowego aktualnego
    przebiegu.
14. Usunięcie pojazdu nie może pozostawić widocznych wpisów historii, zdjęcia ani po cichu osierocić
    zarządzanych plików.

## Zatwierdzone decyzje produktowe

Poniższe decyzje zostały zatwierdzone jako bazowy model domenowy Fazy 0.

1. **Minimalna konfiguracja pojazdu:** marka, model, pojemność zbiornika oraz preferencje jednostek
   odległości, objętości i spalania są wymagane; numer rejestracyjny, VIN, rok, wariant, licznik
   początkowy i zdjęcie są opcjonalne.
2. **Zdjęcie pojazdu:** użytkownik może dodać jedno zdjęcie podczas tworzenia pojazdu, a później je
   zastąpić lub usunąć.
3. **Licznik początkowy i aktualny przebieg:** licznik początkowy jest opcjonalnym odczytem z momentu
   dodania pojazdu. Aktualny przebieg jest osobną wartością, inicjalizowaną tym odczytem i
   aktualizowaną przez odczyty podawane przy wpisach.
4. **Wyższy odczyt wpisu:** pierwszy podany odczyt albo odczyt wyższy od aktualnego aktualizuje
   przebieg pojazdu po wyjaśnieniu tej operacji w formularzu.
5. **Niższy lub niespójny odczyt:** dane historyczne są dozwolone z ostrzeżeniem zamiast blokady.
6. **Przebieg wpisu:** jest opcjonalny, aby można było dodać stare faktury i zdarzenia z nieznanym
   przebiegiem.
7. **Data i godzina zdarzenia:** są wymagane, reprezentują czas UTC i są zapisywane razem w polu
   `occurredAt`; zdarzenie nie może przypadać w przyszłości.
8. **Typ wpisu:** jest niezmienny po utworzeniu; początkowo korekta błędnego typu wymaga ponownego
   utworzenia wpisu.
9. **Wynik przeglądu:** jest wymagany, ale `not-recorded` stanowi dopuszczalną wartość.
10. **Koszt:** jest opcjonalny; zero i brak wartości są różne; historyczne waluty nigdy nie są
    przeliczane automatycznie.
11. **Usuwanie:** w MVP nie ma archiwum ani kosza. Usunięcie wpisu zachowuje powiązane dokumenty na
    poziomie pojazdu; usunięcie pojazdu usuwa kompletny lokalny agregat po jawnym potwierdzeniu.
12. **Nazwa pojazdu:** jest wyprowadzana z marki, modelu i wariantu zamiast stanowić oddzielną nazwę
    własną.
13. **Szczegóły strukturalne:** pierwszy przekrój celowo pomija pozycje robocizny, magazyn części,
    gwarancje, kody diagnostyczne i inne pojęcia zarządzania warsztatem.
14. **Pojemność zbiornika:** podczas tworzenia nowego pojazdu użytkownik podaje obowiązkową dodatnią
    pojemność zbiornika wraz z jednostką objętości. Starszy rekord bez tej wartości nie otrzymuje
    sztucznej wartości podczas migracji.

## Decyzje odłożone ze wskazaną fazą

Poniższe decyzje nie blokują pierwszego przekroju historii pojazdu, ale muszą mieć wskazaną fazę
realizacji, zamiast zniknąć w szczegółach implementacji:

| Decyzja                                                 | Faza docelowa |
| ------------------------------------------------------- | ------------- |
| Własność przypomnień o ubezpieczeniu i przeglądzie      | Faza 6        |
| Unikalność VIN i numerów rejestracyjnych wielu pojazdów | Faza 8        |
| Nagrobki i propagacja usunięć między urządzeniami       | Faza 9        |
