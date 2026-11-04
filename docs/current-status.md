# Bieżący stan projektu

Stan na 4 listopada 2026 r., `main` w commicie `f620569`.

Na branchu `feat/foldable-layouts` przygotowano osobne wdrożenie dla składanych ekranów. [Wyniki lokalnych prób i ograniczenia odbioru](foldable-baseline-2026-11-04.md#wynik-wdrożenia-i-powtórki). Poniższy stan maina nie obejmuje tej zmiany.

## Aplikacja na mainie

Zakres FREE z faz 0–7 jest zintegrowany. Użytkownik prowadzi lokalną ewidencję jednego pojazdu na urządzeniu. Aplikacja obsługuje historię przeglądów, wymian i napraw, tankowania z przeliczaniem jednostek oraz terminy ubezpieczenia i badania technicznego. Powiadomienia są opcjonalne i korzystają ze strefy zapamiętanej przy zapisie terminu. Interfejs jest dostępny po polsku i angielsku, z angielskim jako językiem zapasowym.

SQLite z Drizzle przechowuje dane i metadane plików. Zdjęcie pojazdu pochodzi z galerii, a dokumenty PDF, JPEG i PNG można importować i przeglądać wewnątrz aplikacji. Potwierdzone wyczyszczenie danych usuwa również zarządzane kopie plików i zaplanowane przypomnienia. Oryginały pozostają w galerii i u dostawcy plików. JSON v4 jest kontraktem wewnętrznym. Użytkownik nie ma funkcji eksportu ani odtwarzania bazy. [Zakres produktu](product-scope.md) i [zasady prywatności](privacy-and-permissions.md).

Aktualny stos to Expo 58.0.22 i React Native 0.88.1. Akceptację integracji natywnej prowadzimy na własnych lokalnych buildach. Ostatnia udokumentowana wysyłka do App Store Connect to iOS 0.8.2 (5) z 12 października. Listopadowe testy dotyczą nowszego kodu z lokalnych buildów Release. Kolejny etap według planu to faza 8, czyli stabilizacja na podstawie opinii użytkowników. [Historia TestFlight](testflight-preparation.md) i [plan faz](delivery-plan.md).

## Ostatnie zmiany

- `69e285a` wprowadza na Androidzie natywne kontrolki Material, ciemne tło `#010101`, formularze z walidacją i potwierdzeniem odrzucenia zmian. Telefon korzysta z zakładek, a szeroki układ z bocznej nawigacji oraz listy i szczegółów obok siebie. Na Pixel Tablet sprawdzono pion, poziom i zachowanie szkicu po obrocie. [Opis wdrożenia](android-material-expressive.md).
- Poprawiono awarię na Pixel Tablet. Po zmianie rozmiaru tekstu systemowego ze 100% na 160% aplikacja zamykała się po wybraniu Ustawień. Nawigacja korzysta teraz z routera bieżącego drzewa komponentów przez `useRouter()`. Na poprawionym APK powtórzono zmianę skali, wejście w Ustawienia, edycję pojazdu i przejście do sekcji danych. [Reprodukcja i wynik powtórki](android-material-final-qa-2026-11-03.md#confirmed-issue-and-correction).
- `f620569` stabilizuje typowanie stanu przycisku Androida i test akcji dialogu. Regresja startu iOS sprawdza teraz wygenerowane przez lokalny prebuild pliki `Info.plist` i `SceneDelegate.swift`.

## Ostatnia udokumentowana weryfikacja

W raporcie z **3 listopada** pełny `nub run check` przeszedł z wynikiem **76 zestawów i 488 testów**. React Doctor nie zgłosił problemów w zmienionym zakresie; skan wykonano bez oceny punktowej. Wyniki dotyczą przebiegu opisanego w raporcie, przed commitem `f620569`.

Ten sam APK Release z włączonym R8 przetestowano na Pixel 9 i Pixel Tablet z Androidem 17, zachowując istniejące dane QA. Sprawdzono m.in. walidację pustej ilości paliwa, terminy przy wyłączonych powiadomieniach, ochronę szkiców i nawigację po zmianie skali tekstu. Weryfikacja Apple objęła start Release i natywne kontrolki dodawania pojazdu na iPhone 18 Pro i iPad Air 11″ (M4) z systemem 27.2. [Macierz listopadowego QA](android-material-final-qa-2026-11-03.md#runtime-checks) i [wcześniejsze testy trwałości danych oraz PDF](android-regression-2026-10-17.md).

## Weryfikacja TalkBack i gestu cofania na Androidzie

4 listopada użytkownik potwierdził wykonanie ręcznych testów TalkBack i gestu cofania na fizycznym urządzeniu z Androidem. Poniżej zapisano obserwacje z wcześniejszych prób na emulatorach oraz kryteria ręcznej weryfikacji. Wyników poszczególnych kryteriów na urządzeniu fizycznym nie odnotowano.

### TalkBack

**Potwierdzono** działanie usługi i eksploracji dotykiem na obu emulatorach. Na telefonie obserwowano fokus m.in. na tytule selektora daty i dialogu odrzucenia zmian, a na tablecie na Ustawieniach i przycisku anulowania edycji. Automatyzacja nie pozwoliła wiarygodnie ocenić kolejności odczytu ani treści wypowiadanych komunikatów.

**Kryteria ręcznej weryfikacji** przy włączonym TalkBack i odłączonej automatyzacji:

1. Przejść przez wszystkie cztery pozycje nawigacji oraz formularz z błędem. Odsłuchać etykiety, role, stan zaznaczenia i komunikat walidacyjny. Sprawdzić kolejność odczytu, zrozumiałość wymowy oraz możliwość wykonania akcji podwójnym stuknięciem.
2. Obsłużyć selektory daty i godziny oraz dialog odrzucenia zmian. Sprawdzić, czy fokus pozostaje w otwartym dialogu i wraca do właściwej kontrolki po jego zamknięciu.
3. Otworzyć PDF, przejść między stronami i zamknąć podgląd, posługując się czytnikiem. [Wyniki próby TalkBack](android-material-final-qa-2026-11-03.md#talkback).

### Gest cofania (predictive back)

**Potwierdzono** powrót ze szczegółów wpisu na telefonie i z sekcji danych do Ustawień na tablecie. Gest na zmienionym formularzu wywołał potwierdzenie, a wybór kontynuowania edycji zachował szkic. Przy powolnym geście zaobserwowano systemową strzałkę. Podczas próby anulowania szczegóły pozostały otwarte, ale nagranie nie wykazało rozpoczęcia interaktywnego podglądu poprzedniego ekranu.

**Kryteria ręcznej weryfikacji.** Przy powolnym geście od krawędzi poprzedni ekran powinien stawać się widoczny proporcjonalnie do ruchu palca. Dokończenie gestu otwiera ekran docelowy. Cofnięcie palca do krawędzi powinno wycofać animację i pozostawić bieżący ekran. [Wyniki próby gestu cofania na emulatorach](android-material-final-qa-2026-11-03.md#predictive-back).

Przed wydaniem pozostaje również sprawdzenie niezawodności powiadomień na fizycznym urządzeniu i ponowienie audytu podatności rejestru. Wcześniejszy pojedynczy incydent inicjalizacji SQLite jest śledzony jako nieodtworzony i nieblokujący. [Bramki wydaniowe](delivery-plan.md#recommended-next-step).
