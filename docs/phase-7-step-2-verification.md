# Faza 7 — weryfikacja kroku 2

Data: 2026-09-04. Dokument roboczy. Branch: `feat/free-release-hardening`.

## Zakres wdrożenia

- Ustawienia PL/EN udostępniają potwierdzane, nieodwracalne czyszczenie wszystkich danych aplikacji.
- Reset blokuje nowe operacje, czeka na trwające zapisy/pickery i harmonogram, zapisuje trwały
  znacznik, usuwa własne powiadomienia zaplanowane i dostarczone, czyści rekordy transakcyjnie,
  usuwa zarządzane pliki oraz prywatne cache pickerów i obrazów. Dopiero potem usuwa znacznik
  i tworzy nowy zestaw usług z formularzem pierwszego pojazdu.
- Migracja `0008_add_pending_data_reset` dodaje pojedynczy znacznik intencji. Restart wznawia
  przerwaną operację przed uzgadnianiem plików i planowaniem powiadomień. Nieudane czyszczenie
  pokazuje ponowienie; błąd odczytu bazy nigdy nie jest zgodą na jej wymazanie.
- PDF można zapisać do folderu wybranego systemowo. Nie ma podglądu PDF ani automatycznego
  otwierania innej aplikacji. Obrazy mają tylko podgląd wewnętrzny, bez akcji eksportu.
- Istniejące pliki w folderze docelowym nie są nadpisywane. Błąd zapisu sprząta nową częściową
  kopię; anulowanie nie pokazuje komunikatu sukcesu. Reset nie dotyka zewnętrznych PDF ani
  oryginałów z galerii/Plików. Nie ma eksportu/importu całej bazy ani funkcji przywracania.

## Weryfikacja automatyczna

- `nub run check`: 64 zestawy, 444 testy; lint, formatowanie, TypeScript i kontrola migracji.
- Testy obejmują kolejność resetu, współbieżność, ponowienie błędów, brak niezamówionego resetu,
  blokowanie spóźnionych zapisów, wznowienie po restarcie, anulowanie potwierdzenia, czyszczenie
  własnych powiadomień i cache, obsługę zapisu PDF oraz brak eksportu obrazów.
- Rzeczywisty SQLite z adapterem Drizzle sprawdza kasowanie kaskadowe, zachowanie migracji,
  znacznik po ponownym otwarciu bazy i możliwość dodania kolejnego pierwszego pojazdu.
- Expo Doctor: 19/21; znane nierozpoznawanie `nub.lock`, celowy TypeScript 7 i nowsze patche
  pakietów Expo. Nie zmieniano zależności ani reguł zaufania.
- React Doctor 0.9.13: pozostaje istniejące ostrzeżenie o złożoności widoku workspace;
  nie dodano nowych kategorii problemów. Wynik liczbowy zależy także od zakresu skanu.

## Urządzenia natywne

Własne buildy QA Release, `dev.mojeauto.qa`, bez Metro i bez przeglądarki:

| Urządzenie                      | Układ/język | Zweryfikowane                                                                                |
| ------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| iPhone 17 Pro, iOS 26.5         | pion / PL   | import PDF, zapis kopii do Plików, potwierdzenie resetu, formularz pierwszego pojazdu        |
| iPad Air 11 M4, iPadOS 26.5     | poziom / PL | import PDF, zapis kopii obok oryginału, reset historii i załącznika, pusta baza              |
| Pixel 9, Android 17/API 37      | pion / EN   | zapis PDF przez SAF do Documents, reset, formularz pierwszego pojazdu                        |
| Pixel Tablet, Android 17/API 37 | poziom / EN | zapis PDF przez SAF, anulowanie potwierdzenia i właściwy reset, formularz pierwszego pojazdu |

Pobrane PDF-y na Androidzie i iPadzie porównano przez SHA-256 z plikiem źródłowym; były identyczne
i pozostały po resecie. Na iPadzie kontrola SQLite wykazała zero rekordów pojazdu, historii,
dokumentów, zarządzanych plików, tankowań, przypomnień i znacznika resetu; katalog magazynu usunięto.
Testy kasowały wyłącznie dane QA, nie dane innej aplikacji. Dane usunięte z QA nie podlegają
odtworzeniu przez aplikację; oryginalne pliki testowe pozostały poza nią.

## Problemy wykryte podczas testów

1. Android: `File.copy` z `overwrite: true` w Expo SDK 57 usuwa plik docelowy SAF przed zapisem
   do jego URI. Na obu emulatorach prowadziło to do błędu pobrania. Dla `content://` używamy
   natywnego asynchronicznego zapisu base64 do nowego URI; kopiowanie Apple pozostaje natywne.
   Pliki wejściowe mają limit 20 MB. Regresja adaptera sprawdza, że ścieżka SAF nie woła `File.copy`.
   Ponowiony test obu emulatorów potwierdził zapis i zgodną sumę kontrolną.
2. iPhone: wybrany PDF bez kopii cache nie zapisywał się po zamknięciu pickera i przejściu przez
   formularz. `copyToCacheDirectory: true` na iOS ustabilizowało ten scenariusz; Android zachowuje
   bezpośredni URI z nadanym dostępem, zgodnie z wcześniejszymi testami Expo Go. Kopia z pickera jest
   prywatna i objęta resetem. iPad również przeszedł import.
3. Systemowy picker iPada bywa niepełny w drzewie dostępności narzędzia. Weryfikowano wtedy
   rzeczywisty zrzut ekranu i wskazane na nim kontrolki; nie traktowano samego pustego drzewa jako
   błędu aplikacji.

## Granice i następny krok

Wznowienie po awarii procesu jest pokryte testami trwałego znacznika i inicjalizacji; nie jest to
symulacja fizycznej utraty zasilania. Czyszczenie cache obrazu ma osobny test błędu adaptera.
Nie deklarujemy kryminalistycznego wymazywania flash ani usuwania kopii wykonywanych przez OS.
Fizyczne urządzenia, iCloud/zewnętrzni dostawcy plików, duże PDF-y i pełny audyt dostępności
pozostają bramkami wydania. Dotychczasowy incydent inicjalizacji SQLite Androida po zmianie skali
nie został odtworzony ani uznany za naprawiony. Decyzją produktową pozostaje jednym znanym,
nieblokującym błędem; krok 3 jest zaakceptowany, a następny zakres to krok 4.
