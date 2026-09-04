# Robocze decyzje domenowe przypomnień

## Status

**Status:** ustalenia zaakceptowane przez użytkownika.

**Faza:** 6 — przypomnienia. Etapy 1–7 zakończone; gotowe do review/PR. Zakres weryfikacji
i otwarte ograniczenia: [raport etapu 7](phase-6-step-7-verification.md).

Dokument zapisuje uzgodniony zakres i zachowanie produktu. Szczegóły techniczne harmonogramu
oraz ograniczenia platform opisują dokumentacja techniczna i raport końcowej weryfikacji.

## Postęp wdrożenia

1. **Gotowe:** domena i testy reguł — tworzenie i edycja, `ReminderId` UUIDv7, osobne znaczniki
   utworzenia i aktualizacji, walidacja dat i stref, stany terminu oraz obliczanie planu powiadomień.
2. **Gotowe:** SQLite, migracja `0007_add_vehicle_reminders.sql`, repozytorium, operacje
   aplikacyjne i [eksport JSON v4](data-export-v4.md).
3. **Gotowe:** adapter lokalnych powiadomień, obsługa uprawnień i konfiguracja natywna.
4. **Gotowe:** uzgadnianie harmonogramu po zmianach danych, restarcie i zmianie uprawnień.
5. **Gotowe:** interfejs telefonu i tabletu, lokalizacja PL/EN, kontekstowe objaśnienie zgody,
   stany uprawnień i błędów oraz testy UI. Zakres prób natywnych opisuje
   [raport etapu 5](phase-6-step-5-verification.md); nie zamykają one etapu 7.
6. **Gotowe:** przegląd wszystkich zależności, aktualizacja 15 bezpośrednich pakietów i grafu
   przechodniego, poprawki zgodności React Compiler i testy automatyczne. Zgodność SDK, karencja
   i wyjątki: [raport zależności](phase-6-step-6-dependencies.md).
7. **Gotowe:** własne buildy na czterech formatach, zgody i dostarczanie powiadomień, restart,
   strefy, reprezentatywne regresje, poprawka lokalizacji natywnych i dokumentacja końcowa.
   Audyt podatności nadal bez wyniku; fizyczne urządzenia i akceptacja sklepowa należą do Fazy 7.

Etap 6 obejmuje root repozytorium i workspace mobilny, przegląd zależności przechodnich oraz
overrides i aktualizację `nub.lock`. Pakiety Expo, React i React Native aktualizujemy jako zgodny
zestaw wspierany przez SDK, nie niezależnie do dowolnych wersji `latest`. Pozostałe pakiety również
wymagają oceny zmian niekompatybilnych. Wyjątki od aktualizacji trzeba jawnie udokumentować.
Zachowujemy NUB, SFW, dokładne wersje, okres karencji 24 godzin oraz istniejące wersje toolchainu;
ewentualna konieczność zmiany Node/NUB wymaga osobnej decyzji. Nie zmieniamy świadomego wyboru
TypeScript 7 wyłącznie w celu wyciszenia Expo Doctor.

Przed i po aktualizacji uruchamiamy testy automatyczne; po niej również React Doctor i Expo Doctor.
Etap 7 sprawdza całą Fazę 6 oraz regresje dotychczasowych funkcji na iPhonie, iPadzie, telefonie
z Androidem i tablecie z Androidem, na buildach uwzględniających zaktualizowane moduły natywne.
Expo Go może służyć do szybkich prób, ale nie zastępuje weryfikacji własnego buildu aplikacji.

Domena nie odczytuje systemowej strefy ani bieżącego czasu samodzielnie: otrzymuje je jawnie.
Edycja przyjmuje wyłącznie datę i wyprzedzenia; zachowuje właściciela, rodzaj, identyfikator,
czas utworzenia i strefę. Brak wyprzedzeń oznacza wyłączone powiadomienia, nie usunięcie terminu.
Unikalność rodzaju terminu dla pojazdu jest egzekwowana przez operacje aplikacyjne i unikalny
indeks SQLite; sama fabryka pojedynczego rekordu nie ma dostępu do pozostałych terminów.

Planowanie używa jawnej strefy i kalendarza gregoriańskiego przez `Intl.DateTimeFormat`.
Każde lokalne 09:00 jest przeliczane i sprawdzane przez konwersję zwrotną. Brak takiej chwili
(np. pominięty dzień w strefie) zwraca błąd `notificationSchedule`, zamiast przesuwać termin.
Jeżeli 09:00 występuje dwukrotnie, wybierana jest pierwsza chwila. Plan nie zawiera chwil
równych bieżącemu czasowi ani wcześniejszych. Stabilne klucze pary przypomnienie–wyprzedzenie
służą do uzgadniania harmonogramu. Adapter używa ich również jako identyfikatorów żądań
systemowych; nie zapisujemy stanu harmonogramu w rekordzie domenowym ani eksporcie.

Etap 1 nie zmienia zależności, schematu SQLite ani UI i nie planuje rzeczywistych powiadomień.
Zgodność obliczeń z natywnym silnikiem aplikacji pozostaje częścią dalszej weryfikacji.

Etap 2 dodaje tabelę `reminders` i udostępnia `ReminderService` przez istniejący provider aplikacji,
bez zmian widocznego UI i bez nowych zależności. Usunięcie pojazdu usuwa jego terminy kaskadowo.
Odczyt sprawdza pełny kontrakt domenowy; uszkodzone dane zwracają `corrupt-data`.
Edycja pobiera aktualny rekord z repozytorium i nie pozwala podmienić chronionych metadanych.
Testy wykonują SQL, migracje i transakcje sterownika Expo Drizzle na rzeczywistym SQLite przez
testowy adapter transportu. Obejmują migrację istniejących danych, ponowne uruchomienie migratora,
ponowne otwarcie pliku, konflikty, izolację pojazdów i rollback błędu zapisu.
Nie zastępuje to testów silnika SQLite i powiadomień na urządzeniach, zaplanowanych na dalsze etapy.

Etap 3 wprowadza `expo-notifications` 57.0.15 i port `ReminderNotifications`. Harmonogram domeny
jest przekazywany jako jednorazowe chwile UTC. Start aplikacji rejestruje tylko prezentację
powiadomień w foreground; nie pyta o zgodę ani nie planuje terminów. Żądanie zgody jest osobną
operacją przeznaczoną dla kontekstowego objaśnienia w UI etapu 5. Adapter rozróżnia prowizoryczną
zgodę iOS oraz blokadę kanału Androida i udostępnia przejście do ustawień systemowych.
Nie wprowadzamy zdalnych powiadomień ani dodatkowej zgody na alarmy dokładne. Powiadomienie
może być opóźnione przez system operacyjny. Konfigurację, granice integracji oraz dalsze testy
opisuje [local-reminder-notifications.md](local-reminder-notifications.md).

Etap 4 uruchamia uzgadnianie przy starcie, powrocie aplikacji do foreground, zmianie języka,
zakończeniu jawnego żądania zgody oraz udanych zapisach i usunięciach terminów lub pojazdu.
Zapis SQLite nie czeka na system powiadomień. Kolejne przebiegi są szeregowe i odczytują aktualne
dane oraz rzeczywistą listę alertów. Pasujące alerty pozostają bez zmian, a nieaktualne są usuwane.
Błędy zachowujemy w wyniku ostatniego przebiegu; ponowienie następuje jawnie lub przy kolejnym
zdarzeniu. Nie ma automatycznej pętli retry w tle. Brak zgody nie usuwa terminów.
Treść powiadomień jest po polsku lub angielsku z angielskim fallbackiem. Testy automatyczne
obejmują częściowe awarie, restart koordynatora i usunięcie podczas planowania; dostarczanie
przez system operacyjny sprawdzono natywnie w etapie 7, w zakresie opisanym w raporcie.

## Zakres i własność

- Obsługujemy ubezpieczenie i badanie techniczne, bez przypomnień o oleju i innych serwisach.
- Pojazd może mieć jeden bieżący termin każdego rodzaju. Oba są opcjonalne.
- Terminy są osobnymi rekordami przypisanymi do pojazdu, niezależnymi od wpisów historii.
- Nie tworzymy archiwum poprzednich terminów w tej fazie.
- Zapis badania technicznego w historii nie zmienia automatycznie przypomnienia.

## Data ważności i stany

- Formularz pokazuje „Ubezpieczenie ważne do” albo „Badanie techniczne ważne do”.
- Użytkownik wybiera samą datę, bez godziny i oznaczenia UTC.
- Termin ma stan nadchodzący, „Dzisiaj” albo „Po terminie”.
- W wybranym dniu termin jest „Dzisiaj”; od następnego dnia jest „Po terminie”.
- Granice dnia wyznacza zapamiętana strefa przypomnienia, nie aktualna strefa urządzenia.
- Można zapisać datę z przeszłości. Nie wysyłamy zaległych powiadomień.
- Po terminie pozostaje widoczne ostrzeżenie. Nie wysyłamy codziennych ponagleń i nie
  przedłużamy daty automatycznie o rok. Użytkownik zmienia datę albo usuwa termin.

## Powiadomienia i strefa czasowa

- Domyślne powiadomienia: 7 dni wcześniej, 1 dzień wcześniej i w dniu terminu.
- Godzina powiadomień: 09:00. W tej fazie użytkownik nie wybiera dowolnej godziny.
- Poszczególne wyprzedzenia można wyłączyć osobno dla każdego terminu.
- Przy tworzeniu przypomnienia zapamiętujemy strefę czasową urządzenia, np. `Europe/Warsaw`.
- Podróż lub zmiana strefy systemowej nie zmienia strefy istniejącego przypomnienia.
- Zwykła edycja daty lub ustawień powiadomień zachowuje tę strefę.
- Strefa uwzględnia własne reguły czasu letniego i zimowego. Nie zapisujemy jej znaczenia
  jako stałego przesunięcia względem UTC.
- Przykład: przypomnienie utworzone w Warszawie pozostaje zaplanowane na 09:00 czasu
  warszawskiego także po podróży do Londynu, nie na 09:00 czasu londyńskiego.
- Wyprzedzenia liczymy w dniach kalendarzowych zapamiętanej strefy, a nie jako wielokrotność
  24 godzin odejmowaną od znacznika UTC.
- Data ważności nie jest datą i godziną zdarzenia historycznego. Dotychczasowa zasada UTC
  dla wpisów historii i tankowań pozostaje bez zmian.

## Uprawnienia

- O zgodę systemową prosimy przy pierwszym włączeniu powiadomień dla terminu, po krótkim
  wyjaśnieniu, a nie podczas onboardingu.
- Odmowa nie blokuje zapisu terminu ani korzystania z listy przypomnień.
- Pokazujemy informację o wyłączonych powiadomieniach i możliwość przejścia do ustawień systemowych.
- Lista w aplikacji jest źródłem prawdy; dostarczenie powiadomienia nie określa stanu terminu.

## Interfejs

- Osobna sekcja „Przypomnienia” dla wybranego pojazdu zawiera dwie karty: ubezpieczenie
  i badanie techniczne.
- Brak daty pokazujemy jako „Dodaj termin”.
- Po zapisie albo usunięciu wracamy do listy przypomnień. Usunięcie i porzucenie zmienionego
  formularza wymagają potwierdzenia. Data korzysta z natywnego selektora bez godziny i etykiety UTC.
- Tablet zachowuje kartę pojazdu po lewej, a lista i formularz zajmują prawy obszar.
- Zgoda jest osobną czynnością po zapisie terminu. Błąd powiadomień pozostawia termin widoczny
  i umożliwia ponowienie; odmowa udostępnia przejście do ustawień systemowych.
- Nie dokładamy obowiązkowych pól do formularza dodawania pojazdu.
- Zachowujemy obsługę polskiego i angielskiego, ciemny motyw oraz natywne układy telefonu
  i tabletu na obu platformach.

## Trwałość, eksport i harmonogram

- Terminy i preferencje powiadomień działają offline.
- Eksport JSON obejmuje terminy, zapamiętane strefy i wybrane wyprzedzenia.
- Nie eksportujemy uprawnień systemowych ani identyfikatorów powiadomień przypisanych do urządzenia.
- Edycja terminu lub wyprzedzeń aktualizuje harmonogram bez duplikatów.
- Usunięcie terminu albo pojazdu usuwa odpowiadające mu zaplanowane powiadomienia.
- Podczas implementacji należy zdefiniować odtwarzanie harmonogramu po restarcie aplikacji
  i zmianie uprawnień oraz sprawdzić ograniczenia systemowe. Nie zakładamy gwarantowanego
  dostarczenia powiadomienia dokładnie o zadanej godzinie przez system operacyjny.

## Weryfikacja przed zamknięciem fazy

- Unikalność typu terminu w obrębie pojazdu i niezależność od historii.
- Stany daty, granica północy, daty przeszłe i brak wysyłania zaległych powiadomień.
- Zmiana strefy urządzenia bez zmiany zapamiętanej strefy przypomnienia.
- Przejście czasu letniego i zimowego z zachowaniem 09:00 oraz dni kalendarzowych.
- Tworzenie, edycja, usuwanie, restart i ponowne planowanie bez duplikatów.
- Odmowa i cofnięcie uprawnień bez utraty terminów.
- Eksport danych bez stanu powiadomień specyficznego dla urządzenia.
- Weryfikacja na iPhonie, iPadzie, telefonie z Androidem i tablecie z Androidem;
  dodatkowo fizyczne urządzenia, jeżeli wymaga tego zachowanie powiadomień.
