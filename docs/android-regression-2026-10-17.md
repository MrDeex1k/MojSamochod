# Weryfikacja Androida po aktualizacji zależności

Dokument roboczy z 17 października 2026 r. Wyniki dotyczą lokalnych emulatorów,
nie fizycznych urządzeń ani wydania sklepowego.

## Środowisko

- MacBook z Apple Silicon, emulatory Pixel 9 i Pixel Tablet, Android 17 / API 37.
- Expo 58.0.14, React Native 0.88.0, aplikacja 0.8.2.
- Emulatory uruchomione ponownie bez wczytywania snapshotów, testowane pojedynczo.
- Aktualny natywny Debug APK: `pl.jakubbatycki.mojeauto`, lokalne Metro.
- Dodatkowy Release APK: `dev.mojeauto.qa`, R8, JavaScript wewnątrz APK, bez Metro.
- Interfejs polski i angielski, ciemny wygląd. Terminy zachowują Europe/Warsaw.

## Wykonane scenariusze

| Obszar                                                                      | Telefon                                                                            | Tablet                                         |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| Zimny start i zachowanie wcześniejszej bazy                                 | OK                                                                                 | OK, także Release QA                           |
| Nawigacja pomiędzy historią, paliwem, terminami i ustawieniami              | OK                                                                                 | OK                                             |
| Dodanie, edycja i usunięcie wpisu historii                                  | OK, naprawa                                                                        | OK, przegląd                                   |
| Dodanie, edycja i usunięcie tankowania                                      | OK                                                                                 | OK                                             |
| Bezpośrednie przyciski edycji/usuwania tankowania i potwierdzenie usunięcia | OK, także anulowanie                                                               | OK                                             |
| Przeliczenie galonów US na litry w istniejących tankowaniach                | OK                                                                                 | OK                                             |
| Wybór jednostek objętości i zużycia obok siebie                             | OK                                                                                 | OK                                             |
| Pusta lista dokumentów i powrót bez dodawania pliku                         | OK                                                                                 | OK                                             |
| Import dwustronicowego PDF, podgląd i pełny ekran                           | OK                                                                                 | OK                                             |
| Zmiana strony PDF i powiększenie                                            | OK                                                                                 | OK, także dopasowanie strony                   |
| Edycja metadanych dokumentu i usunięcie z potwierdzeniem                    | OK                                                                                 | OK                                             |
| Zachowanie wpisu i PDF po wymuszonym zakończeniu i ponownym uruchomieniu    | OK                                                                                 | OK                                             |
| Natywny wybór daty, zapis terminu, otwarcie edycji i usunięcie              | OK, ubezpieczenie                                                                  | OK, badanie techniczne                         |
| Wyjaśnienie zgody, systemowy dialog i stan włączonych powiadomień           | OK                                                                                 | OK                                             |
| Ochrona szkicu i kontynuowanie edycji po anulowaniu wyjścia                 | Nie powtarzano osobno                                                              | OK                                             |
| Zachowanie szkicu po obrocie i zapis                                        | Nie dotyczy tej próby                                                              | OK                                             |
| Pierwszy pojazd po wyczyszczeniu danych                                     | Potwierdzenie testów telefonu od użytkownika; tego scenariusza agent nie powtarzał | OK, Release QA                                 |
| Zdjęcie z galerii, kadrowanie, zapis i odtworzenie po zimnym starcie        | Nie powtarzano osobno                                                              | OK, Release QA, `example-photos/volvov40.jpeg` |
| Zmiana licznika 100 000 mi na 160 934 km                                    | Nie powtarzano osobno                                                              | OK, Release QA                                 |
| Usunięcie wszystkich danych i powrót do pustego formularza                  | Nie wykonywano w standardowej aplikacji                                            | OK, wyłącznie izolowana aplikacja QA           |

W bieżącej próbie nie wystąpił crash aplikacji ani wcześniejsze zawieszanie System UI.
Dowody obejmują drzewo dostępności, odczyt zapisanych wartości, zrzuty ekranów i logi.
Zmiana języka telefonu przez ustawienia Androida została potwierdzona po zimnym starcie.

## Poprawka wykryta podczas testów

Expo Notifications 58.1.5 zgłaszało brak pliku dźwięku `default` przy tworzeniu
kanału Androida. Usunięto opcjonalne `sound` z konfiguracji kanału, zachowując
systemowy dźwięk domyślny. Ustawienie dźwięku treści powiadomienia, w tym na iOS,
pozostało bez zmian. Test adaptera wykazał błąd przed poprawką i przeszedł po niej.

Na tablecie potwierdzono kanał `vehicle-reminders-v1` z dźwiękiem
`content://settings/system/notification_sound`, trzy alarmy po zapisaniu terminu
i brak tych alarmów po jego usunięciu. Nowe ostrzeżenie nie pojawiło się ponownie.
Nie przyspieszano zegara i nie potwierdzano faktycznego doręczenia przyszłego powiadomienia.

## Automatyczna weryfikacja i granice

- `nub run check`: 72 zestawy, 474 testy, wszystkie przeszły po poprawce.
- React Doctor: 100/100, brak wykrytych problemów w zmienionym zakresie.
- Expo Doctor: 17/20. Znane diagnostyki dotyczą ignorowanego `nub.lock`, katalogu
  Icon Composer `Car.icon` i rekomendacji starszych wersji Jest/TypeScript.
  Kontrola duplikatów modułów natywnych przechodzi. Nie osłabiono kontroli SFW.
- Lokalny Android Release QA: kompilacja zakończona powodzeniem, 604 zadania.
- Zachowano trzygodzinną karencję zależności i dokładne wersje pakietów.

To regresja wymienionych przepływów, nie dowód przetestowania każdej kombinacji
pól, skali czcionki, dostawcy plików i stanu uprawnień. Obliczenia domenowe i
dodatkowe przypadki błędów obejmuje zestaw automatyczny. Fizyczny Android,
doręczenie powiadomień i akceptacja nowego buildu TestFlight pozostają osobnymi
testami wydaniowymi. Niczego nie wysłano do EAS ani do sklepów.

Usunięto własne wpisy, tankowania, dokumenty i terminy z tej próby w standardowej
aplikacji. Pełne czyszczenie wykonano tylko w `dev.mojeauto.qa`; usunięte testowe
dane QA nie mają odtworzenia w aplikacji. Oryginalne zdjęcia i PDF pozostały w emulatorze.
