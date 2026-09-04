# Faza 7 — krok 1: ustawienia, prywatność i dostępność

Branch: `feat/free-release-hardening`, utworzony po commicie dokumentacji `b1544f9` na `main`.

## Wdrożone

- Ekran „Ustawienia i prywatność” dostępny z historii, osobny układ telefonu i prawa kolumna
  tabletu z zachowaniem karty pojazdu. Powrót do historii bez zmiany danych.
- Treści PL/EN: FREE, lokalne dane, brak eksportu/importu/odtwarzania bazy, zachowanie oryginałów,
  opcjonalne zgody, brak dodanej analityki oraz miejsce zmiany jednostek pojazdu.
- Podpowiedzi dostępności we wspólnym `TextField`: błąd ma pierwszeństwo przed helperem.
  Nie zmieniano wypracowanego pionowego wyrównania wartości ani limitowano skalowania tekstu.
- Wyłączone uprawnienia aparatu i mikrofonu. Android bez wstępnej prośby o całą galerię,
  z blokadą szerokich uprawnień do mediów/pamięci, nakładek, odbioru zdalnego push i install-referrer.
- Regresje UI, PL/EN, podpowiedzi, wybranego pliku Androida i wyniku pluginów Expo.

## Weryfikacja

- `nub run check`: 403 testy w 60 zestawach, PASS; lint, format, typy i migracje PASS.
- React Doctor 0.9.13: 93/100 dla zmian tego brancha, jedno ostrzeżenie o złożoności ekranu,
  bez błędów. Nie jest to bezpośrednio porównywalne z 83/100 całej Fazy 6 — zakres diffu jest inny.
- Expo Doctor 1.20.4: 19/21. Nierozpoznawany `nub.lock` oraz kontrola wersji: świadomy TypeScript 7
  i nowe patche Expo 57.0.20, image-manipulator/image-picker 57.0.16, notifications 57.0.17,
  router 57.0.19, sharing 57.0.18. Nie aktualizowano zależności poza zakresem kroku.
- Własne buildy QA Release dla Androida i symulatorów Apple, bez Expo Go i bez Metro.
  Końcowy scalony manifest Androida nie zawiera zablokowanych uprawnień. Apple Info.plist
  nie zawiera opisów aparatu/mikrofonu; opis biblioteki zdjęć pozostaje.

| Cel                                         | Próby                                                                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| iPhone 17 Pro, iOS 26.5, PL, pion           | Otwarcie ustawień, drzewo dostępności, wygląd; Dynamic Type `accessibility-medium`, przewinięcie do jednostek; przywrócone `large`. |
| iPad Air 11 M4, iPadOS 26.5, PL, poziom     | Otwarcie ustawień, dwie kolumny, tekst i przyciski w AX, wizualna kontrola.                                                         |
| Pixel 9, Android 17/API 37, EN, pion        | Otwarcie ustawień, tekst/AX, skala 150%, przewijanie do końca, powrót do skali 100%; incydent poniżej.                              |
| Pixel Tablet, Android 17/API 37, EN, poziom | Ustawienia, powrót do historii, edycja pojazdu, systemowy picker bez szerokiej zgody, wybór zdjęcia, crop i udany zapis.            |

Nie wykonywano odsłuchu pełnych ścieżek VoiceOver/TalkBack ani testów na fizycznym iPhonie 15 Pro.
To ukierunkowany przegląd dostępności wspólnych pól i nowego ekranu, nie certyfikacja całej aplikacji.

## Otwarty incydent — odtworzenie aktywności Androida

Przy pierwszej zmianie `font_scale` z 1.0 na 1.5, na uruchomionej aplikacji Pixel 9 pojawił się
ekran błędu przygotowania lokalnej bazy. „Try again” przywróciło dane i działające UI. Po powrocie
do 1.0 odtworzenie przeszło bez błędu. W ograniczonym odczycie logów nie uzyskano przyczyny SQLite.
Nie stwierdzono utraty danych; nie ustalono przyczyny ani stałej powtarzalności.

Możliwa kolizja zamykania/otwierania połączenia przy odtworzeniu aktywności pozostaje hipotezą,
nie diagnozą. Nie dodano spekulacyjnego retry ani resetu bazy. Incydent musi wejść do kroku 3
(cykl życia, przerwania) i zostać rozstrzygnięty przed akceptacją wydania. Krok 1 nie jest dowodem,
że wszystkie scenariusze zmiany ustawień systemu działają bezbłędnie.

## Granice i następny krok

Brak opublikowanej polityki prywatności: dane wydawcy/kontakt i końcowy audyt przepływów wymagają
uzupełnienia przed wydaniem. Brak analityki w kodzie aplikacji nie zastępuje inspekcji SDK/sieci.
[Inwentaryzacja](privacy-and-permissions.md) opisuje pozostawione uprawnienia i kompromis iOS crop.

Następny jest krok 2: bezpieczny reset wszystkich danych oraz usunięcie istniejącego eksportowania
i udostępniania dokumentów, także z podglądu. Nie dodano atrap tych funkcji w ustawieniach.
