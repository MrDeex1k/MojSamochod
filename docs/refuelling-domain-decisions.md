# Robocze decyzje domenowe tankowań i zużycia paliwa

## Status dokumentu

**Status:** zatwierdzony kontrakt Fazy 5

**Faza realizacji:** Faza 5 — tankowania i zużycie paliwa

**Status implementacji:** ukończona i zweryfikowana natywnie na iPhonie, iPadzie, telefonie z
Androidem oraz tablecie z Androidem

Ten dokument definiuje zatwierdzony model tankowania przed rozpoczęciem migracji, logiki domenowej i
interfejsu. Implementacja Fazy 5 musi zachować opisane reguły albo zmienić dokument razem z kodem.
Stabilny kontrakt eksportu JSON v3 jest opisany w `data-export-v3.md`.

## Zakres Fazy 5

Faza obejmuje:

- rejestrowanie pełnych i częściowych tankowań jednego pojazdu;
- historię, szczegóły, edycję i trwałe usuwanie tankowań;
- ilość paliwa, odczyt drogomierza oraz opcjonalną cenę;
- obliczanie zużycia paliwa wyłącznie z kompletnych i prawidłowych przedziałów;
- wskazanie tankowań użytych do obliczenia;
- lokalne przechowywanie i eksport danych tankowań;
- formatowanie ilości, ceny i wyniku zgodnie z ustawieniami użytkownika.

Poza zakresem pozostają typ paliwa, śledzenie tras, lokalizacja stacji, integracja z paragonami,
automatyczny import transakcji, ceny paliw z internetu oraz prognozowanie zasięgu.

## Słownik

| Pojęcie                | Znaczenie                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Tankowanie             | Zapis dolania paliwa do pojazdu w określonym czasie i przy określonym odczycie drogomierza.       |
| Pełne tankowanie       | Tankowanie zakończone napełnieniem zbiornika do porównywalnego poziomu pełnego.                   |
| Częściowe tankowanie   | Tankowanie, po którym zbiornik nie został napełniony do pełna.                                    |
| Kotwica                | Pełne tankowanie wyznaczające początek albo koniec przedziału obliczeniowego.                     |
| Przedział obliczeniowy | Sekwencja od jednego pełnego tankowania do następnego, wraz z tankowaniami częściowymi po drodze. |
| Zużycie zbiorcze       | Wynik oparty na sumie paliwa i sumie dystansu ze wszystkich prawidłowych przedziałów.             |

## Rekomendowany model tankowania

Każde tankowanie jest osobną encją należącą do pojazdu.

| Pole                  | Wymagane  | Rekomendowana reguła                                                     |
| --------------------- | --------- | ------------------------------------------------------------------------ |
| `id`                  | Systemowo | Stabilny `RefuellingId` w formacie UUIDv7.                               |
| `vehicleId`           | Systemowo | Pojazd będący właścicielem tankowania.                                   |
| `occurredAt`          | Tak       | Data i godzina tankowania zapisana jako jeden znacznik czasu UTC.        |
| `odometerMetres`      | Nie       | Opcjonalny nieujemny odczyt drogomierza przechowywany w metrach.         |
| `quantityMicrolitres` | Tak       | Dodatnia ilość paliwa w kanonicznej jednostce całkowitoliczbowej.        |
| `fillKind`            | Tak       | `full` albo `partial`.                                                   |
| `totalCost`           | Nie       | Łączna zapłacona kwota jako `Money`.                                     |
| `unitPriceMilliUnits` | Nie       | Cena jednostkowa z dokładnością do trzech miejsc po przecinku.           |
| `priceInputMode`      | Nie       | `total` albo `perVolumeUnit`; wskazuje wartość podaną przez użytkownika. |
| `createdAt`           | Systemowo | Czas utworzenia rekordu w UTC, niezależny od UUIDv7.                     |
| `updatedAt`           | Systemowo | Czas ostatniej zapisanej zmiany w UTC.                                   |

Ilość paliwa jest wymagana, a odczyt drogomierza opcjonalny. Tankowanie bez odczytu pozostaje
prawidłowym rekordem historii, ale nie może być kotwicą obliczenia spalania. Brak odczytu przy
tankowaniu częściowym nie wyklucza jego ilości z późniejszego przedziału, jeżeli obie pełne kotwice
mają prawidłowe odczyty.

## Ilość paliwa i jednostki

Rekomendowany wariant:

1. Domena przechowuje ilość jako dodatnią, bezpieczną liczbę całkowitą mikrolitrów.
2. Warstwa prezentacji pozwala wprowadzać litry, galony amerykańskie albo galony imperialne.
3. Jednostka użyta podczas wprowadzania jest zapisywana jako `inputVolumeUnit`, aby formularz edycji
   nie zmieniał po cichu sposobu prezentacji historycznej wartości.
4. Obliczenia zawsze korzystają z wartości kanonicznej, a nie z binarnych liczb zmiennoprzecinkowych.
5. Konwersja galonów do mikrolitrów stosuje jedną udokumentowaną regułę zaokrąglania do najbliższego
   mikrolitra.
6. Zmiana preferencji jednostki nie przepisuje zapisanych tankowań.

Obsługiwane wartości `inputVolumeUnit`:

- `litres`;
- `usGallons`;
- `imperialGallons`.

Preferencja objętości jest jawna i edytowalna. Język lub region urządzenia może dostarczyć wartość
początkową, ale nie może później samoczynnie zmienić wyboru użytkownika.

## Pojemność zbiornika pojazdu

Formularz tworzenia pojazdu otrzymuje wymagane pole `Pojemność zbiornika paliwa`. Pojazd przechowuje:

- dodatnią `fuelTankCapacityMicrolitres` w jednostce kanonicznej;
- `fuelVolumeUnitPreference`, używaną podczas wpisywania pojemności i nowych tankowań;
- `fuelConsumptionUnitPreference`, używaną do prezentacji wyniku spalania.

Pojemność jest obowiązkowa dla każdego nowego pojazdu. Wartość wpisuje się razem z jednostką:
litrami, galonami amerykańskimi albo galonami imperialnymi. Zmiana jednostki prezentacji nie zmienia
kanonicznej pojemności.

Migracja istniejących danych nie może dopisywać zmyślonej pojemności. Starszy pojazd bez tej wartości
pozostaje możliwy do odczytania, ale przed dodaniem pierwszego tankowania aplikacja prosi o
uzupełnienie wymaganej pojemności w edycji pojazdu.

## Cena

Cena jest opcjonalna, ponieważ brak ceny nie wpływa na prawidłowość obliczenia spalania. Zero jest
prawidłową wartością i różni się od braku ceny.

Formularz pozwala wybrać jeden z dwóch trybów wprowadzania:

- `total` — użytkownik podaje łączną zapłaconą kwotę jako `Money`;
- `perVolumeUnit` — użytkownik podaje cenę za wybraną jednostkę objętości.

Zapisywane są obie wartości oraz tryb źródłowy. Wartość, której użytkownik nie podał, jest wyliczana
z ilości paliwa. Edycja wartości źródłowej przelicza drugą wartość w tej samej operacji.

Cena jednostkowa może mieć najwyżej trzy miejsca po przecinku i jest zapisywana jako całkowita liczba
tysięcznych części głównej jednostki waluty, razem z kodem ISO 4217 i jednostką objętości.

Kwota łączna wyliczona z ceny jednostkowej jest zaokrąglana dopiero do najmniejszej jednostki danej
waluty. Regułą jest zaokrąglenie do najbliższej wartości, a dokładną połowę zaokrągla się od zera.
Historyczne ceny nie są automatycznie przeliczane między walutami.

## Reguły pełnego i częściowego tankowania

1. Pierwsze pełne tankowanie z podanym drogomierzem ustanawia kotwicę, ale samo nie daje wyniku
   spalania.
2. Tankowanie częściowe nie zamyka przedziału i jego paliwo jest odkładane do kolejnego pełnego
   tankowania.
3. Następne pełne tankowanie z podanym drogomierzem zamyka przedział.
4. Paliwo przedziału jest sumą ilości ze wszystkich tankowań po kotwicy początkowej, łącznie z
   pełnym tankowaniem końcowym. Ilość z kotwicy początkowej nie należy do tego przedziału.
5. Dystans jest różnicą odczytów drogomierza końcowej i początkowej kotwicy.
6. Kolejne pełne tankowanie może być jednocześnie końcem jednego i początkiem następnego przedziału,
   ale jego ilość paliwa jest liczona tylko w przedziale, który kończy.
7. Edycja albo usunięcie tankowania powoduje ponowne wyliczenie wyników przy odczycie. Wyniki nie są
   przechowywane jako osobne źródło prawdy.

### Przykład

| Zdarzenie | Przebieg | Ilość | Rodzaj    | Udział w przedziale A–C |
| --------- | -------- | ----- | --------- | ----------------------- |
| A         | 10 000   | 40 l  | pełne     | kotwica początkowa      |
| B         | 10 300   | 20 l  | częściowe | 20 l                    |
| C         | 10 600   | 25 l  | pełne     | 25 l i kotwica końcowa  |

Dystans wynosi 600 km, a paliwo użyte do obliczenia 45 l. Wynik to `7,5 l/100 km`.

## Prawidłowość przedziału

Przedział uczestniczy w wyniku tylko wtedy, gdy:

- ma pełne tankowanie początkowe i końcowe z podanymi odczytami drogomierza;
- odczyt końcowy jest większy od początkowego;
- wszystkie tankowania w przedziale mają dodatnią ilość;
- wszystkie podane odczyty tankowań w kolejności czasu nie maleją;
- wszystkie rekordy należą do tego samego pojazdu.

Tankowania są porządkowane rosnąco według `occurredAt`, następnie `createdAt`, a na końcu stabilnego
`id`. Pozwala to deterministycznie obsłużyć rekordy dodawane historycznie i zdarzenia z tym samym
czasem.

Nieprawidłowy albo niekompletny przedział pozostaje widoczny. Interfejs nie pokazuje dla niego
mylącego wyniku, lecz podaje powód, na przykład:

- potrzeba kolejnego pełnego tankowania;
- pełna kotwica nie ma odczytu drogomierza;
- przebieg nie wzrósł;
- odczyty w sekwencji są niespójne.

## Obliczanie zużycia

Warstwa domenowa zwraca dane źródłowe wyniku oraz identyfikatory uczestniczących tankowań. Nie
zwraca wyłącznie gotowego tekstu.

### Litry na 100 kilometrów

`zużycie = suma litrów / suma kilometrów × 100`

### Mile na galon amerykański

`zużycie = suma mil / suma galonów amerykańskich`

### Mile na galon imperialny

`zużycie = suma mil / suma galonów imperialnych`

Wynik zbiorczy jest ilorazem łącznej ilości paliwa i łącznego dystansu prawidłowych przedziałów. Nie
jest średnią arytmetyczną zaokrąglonych wyników poszczególnych przedziałów. Zaokrąglenie do dwóch
miejsc odbywa się dopiero podczas prezentacji.

Rekomendowane wartości `fuelConsumptionUnitPreference`:

- `litresPer100Kilometres`;
- `milesPerUsGallon`;
- `milesPerImperialGallon`.

Preferencja wyniku jest niezależna od jednostki używanej przy wpisywaniu paliwa i od jednostki
drogomierza. Dzięki temu użytkownik może zmienić sposób prezentacji bez utraty danych.

## Wpływ na aktualny przebieg pojazdu

Tankowanie korzysta z tej samej reguły co wpis historii:

- podany pierwszy odczyt albo odczyt większy od aktualnego przebiegu może podnieść aktualny przebieg
  w tej samej transakcji;
- niższy odczyt historyczny jest dozwolony;
- edycja ani usunięcie tankowania nie obniżają automatycznie aktualnego przebiegu pojazdu.

Niespójność chronologicznej sekwencji tankowań nie blokuje przechowywania rekordu, ale może wyłączyć
dotknięty przedział z obliczeń.

## Interfejs użytkownika

- Tankowania mają osobną przestrzeń `Paliwo`, niezależną od listy przeglądów, wymian i napraw.
- Formularz zawsze pokazuje pola opcjonalne zamiast ukrywać je za dodatkową akcją.
- Po zapisie użytkownik wraca do historii tankowań.
- Szczegóły pokazują wszystkie zapisane dane, ale pomijają puste pola bez pozostawiania pustego
  miejsca.
- Usunięcie wymaga potwierdzenia identyfikującego datę i ilość paliwa oraz przebieg, jeżeli został
  podany.
- Podsumowanie wskazuje brak wystarczających danych albo prezentuje wynik wraz z możliwością
  sprawdzenia tankowań uczestniczących w obliczeniu.
- Telefon używa osobnej listy, formularza i szczegółów. Tablet zachowuje wzorzec list–detail zgodny
  z istniejącą przestrzenią pojazdu.

## Persystencja i eksport

- Tankowania są przechowywane w osobnej tabeli SQLite i usuwane razem z pojazdem.
- Integralność relacji z pojazdem jest wymuszana przez klucz obcy.
- Tworzenie lub aktualizacja tankowania i ewentualne podniesienie aktualnego przebiegu odbywają się
  w jednej transakcji.
- Eksport JSON otrzymuje wersję 3 i zawiera źródłowe rekordy tankowań oraz preferencje jednostek.
- Wyliczone spalanie nie jest elementem źródłowym eksportu; może zostać odtworzone z rekordów.
- Import, odtwarzanie backupu i synchronizacja pozostają poza Fazą 5.

## Wymagane testy

1. Dwa kolejne pełne tankowania z odczytami drogomierza tworzą prawidłowy przedział.
2. Jedno lub więcej tankowań częściowych jest doliczane do kolejnego pełnego tankowania.
3. Pierwsze pełne tankowanie nie pokazuje spalania.
4. Sekwencja bez końcowego pełnego tankowania pozostaje niekompletna.
5. Brak odczytu przy tankowaniu częściowym nie wyklucza jego ilości z prawidłowego przedziału.
6. Brak odczytu przy pełnej kotwicy nie pozwala utworzyć przedziału.
7. Malejący albo równy przebieg wyłącza przedział i zwraca czytelny powód.
8. Wynik zbiorczy używa sum paliwa i dystansu, a nie średniej wyników cząstkowych.
9. Konwersje litrów, galonów amerykańskich i imperialnych są deterministyczne.
10. Zaokrąglenie wyniku następuje wyłącznie podczas prezentacji.
11. Cena całkowita i jednostkowa zachowują źródłową precyzję, walutę i tryb wprowadzania.
12. Cena jednostkowa z więcej niż trzema miejscami po przecinku jest odrzucana.
13. Edycja i usunięcie natychmiast zmieniają wynik bez pozostawienia zapisanego agregatu.
14. Tankowanie z odczytem może podnieść aktualny przebieg, ale edycja ani usunięcie go nie obniżają.
15. Migracja, restart bazy i eksport JSON zachowują wszystkie dane źródłowe.
16. Nowy pojazd wymaga pojemności zbiornika, a starszy rekord bez niej wymaga uzupełnienia przed
    pierwszym tankowaniem.

## Stan decyzji

| Nr  | Decyzja                                                                                | Stan         |
| --- | -------------------------------------------------------------------------------------- | ------------ |
| 1   | Litry, galony amerykańskie i imperialne są obsługiwane od pierwszej wersji.            | Zatwierdzona |
| 2   | Odczyt drogomierza jest opcjonalny; spalanie korzysta wyłącznie z podanych odczytów.   | Zatwierdzona |
| 3   | Zapisywane są cena całkowita, jednostkowa oraz źródłowy tryb wprowadzania.             | Zatwierdzona |
| 4   | Cena jednostkowa ma najwyżej trzy miejsca po przecinku.                                | Zatwierdzona |
| 5   | Tankowanie nie ma pola notatki ani pola nazwy stacji.                                  | Zatwierdzona |
| 6   | Tankowania częściowe są sumowane i rozliczane dopiero przez następne pełne tankowanie. | Zatwierdzona |
| 7   | Malejący podany odczyt wyłącza cały dotknięty przedział z obliczeń.                    | Zatwierdzona |
| 8   | Wynik obsługuje `l/100 km`, `mpg US` i `mpg imperial`.                                 | Zatwierdzona |
| 9   | Wynik prezentowany jest z dokładnością do dwóch miejsc po przecinku.                   | Zatwierdzona |
| 10  | Eksport tankowań podnosi kontrakt JSON do wersji 3 w Fazie 5.                          | Zatwierdzona |
| 11  | Pojemność zbiornika paliwa jest obowiązkowa podczas tworzenia nowego pojazdu.          | Zatwierdzona |

Wszystkie decyzje wymagane przed implementacją Fazy 5 zostały zatwierdzone.

## Wynik końcowej weryfikacji

Końcowy test natywny potwierdził pełny przepływ tworzenia, odczytu, edycji i usuwania tankowań,
trwałość po ponownym uruchomieniu, aktualizację przebiegu pojazdu oraz ponowne obliczanie spalania po
zmianach danych. Sprawdzono sekwencję dwóch pełnych tankowań z tankowaniem częściowym bez przebiegu,
oba tryby podawania ceny, dokładność ceny jednostkowej do trzech miejsc, zapis daty i godziny UTC,
pomijanie pustych pól opcjonalnych oraz czytelne potwierdzenie usunięcia.

Układy telefonu i tabletu przeszły weryfikację na iOS i Androidzie. Tablet pokazuje kartę pojazdu i
listę bez pustej karty szczegółów, dodaje trzecią kartę po wyborze rekordu oraz usuwa kartę środkową
na czas formularza. Nieobsługiwany język systemowy poprawnie korzysta z angielskiego fallbacku.
