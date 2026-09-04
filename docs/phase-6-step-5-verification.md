# Faza 6 — weryfikacja robocza etapu 5

Data: 2026-09-04. Host: Expo Go 57.0.9, projekt Expo 57.0.18, Metro.
To weryfikacja nowego UI, nie końcowa akceptacja powiadomień ani całej fazy.

## Urządzenia i wykonane próby

| Urządzenie       | System / układ                  | Wynik                                                                                                                                                                        |
| ---------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iPhone 17 Pro    | iOS 26.5, pion, PL              | Dodanie terminu ubezpieczenia, data „Dzisiaj”, odmowa systemowej zgody bez utraty danych, ponowne otwarcie, potwierdzenie usunięcia i powrót do dwóch pustych kart.          |
| iPad Air 11 (M4) | iPadOS 26.5, poziom, PL         | Karta pojazdu po lewej; lista/formularz po prawej; polski natywny selektor daty; zapis badania technicznego i udzielenie zgody po objaśnieniu. UI pokazuje zgodę włączoną.   |
| Pixel 9          | Android 17 / API 37, pion, EN   | Natywny kalendarz, zapis ubezpieczenia na 20 września, status „Upcoming”, zachowanie terminu po przeładowaniu i czytelny błąd powiadomień z ponowieniem.                     |
| Pixel Tablet     | Android 17 / API 37, poziom, EN | Układ dwóch kart; wybór daty i zapis badania technicznego; edycja i osobne wyłączenie wszystkich trzech wyprzedzeń; zapis zachowuje datę i pokazuje wyłączone powiadomienia. |

Sprawdzono drzewa dostępności i zrzuty ekranów. Brak nakładania kontrolek lub nienaturalnych
wysokości tekstu; lista i formularze są przewijalne. Zrzuty robocze pozostają w `/tmp`, nie są
trwałymi artefaktami repozytorium. Nie używano Expo Web do akceptacji UI.

## Ograniczenia i dalsze sprawdzenie

- Android Expo Go zgłasza błąd natywnego `NotificationsChannelsProvider` przy odczycie kanału.
  Nie obchodzimy kontroli uprawnień. UI pokazuje błąd, a zapis SQLite nadal działa.
- Import publicznego entry pointu `expo-notifications` uruchamiał zdalną rejestrację tokenów
  i zatrzymywał Android Expo Go. Dodano lokalną fasadę importów z testem regresji; trzeba ją
  ponownie ocenić przy aktualizacji pakietów. Szczegóły: `local-reminder-notifications.md`.
- Fast Refresh podczas zmian modułów infrastruktury spowodował przejściowy ekran błędu
  inicjalizacji plików; pełne przeładowanie Metro przywróciło aplikację na wszystkich urządzeniach
  bez usuwania danych. Nie traktować HMR jako testu zimnego startu własnego buildu.
- Nie potwierdzono jeszcze rzeczywistego dostarczenia, odwołania alertu po zamknięciu aplikacji,
  restartu systemu ani podróży. Wymagają etapu 7 po aktualizacji zależności, także we własnych
  buildach i na fizycznych urządzeniach, jeśli ograniczenia symulatorów tego wymagają.

## Automatyczna regresja

- `nub run check`: 57 zestawów, 386 testów.
- Nowe testy obejmują formularz na obu platformach, strefę historycznego terminu, wyprzedzenia,
  daty przeszłe/dzisiejsze/przyszłe, błędy zapisu/usunięcia, potwierdzenia, zgodę, odmowę,
  błąd inspekcji uprawnień i ponowienie, polską lokalizację, subskrypcję wyniku harmonogramu
  oraz brak inicjalizacji zdalnych tokenów przez fasadę.
- React Doctor 0.9.13: 87/100, trzy uwagi. Dwie o `await` w pętli dotyczą celowej kolejności
  anulowania i planowania z etapu 4; równoległe operacje zmieniłyby kontrakt odzyskiwania po błędzie.
  Trzecia dotyczy istniejącej złożoności przełączania widoków w `HistoryWorkspaceView`.
  Nie dodano wyciszeń i nie rozszerzano kroku o przebudowę całej nawigacji.

Uzupełnienie z etapu 6: powyższy skan przed commitem objął 34 pliki i nie uwzględnił wszystkich
nowych plików nieśledzonych. Pełniejszy skan po commicie objął 40 plików i wykrył dodatkowe
diagnostyki; pięć problemów React Compiler poprawiono w etapie 6. Wynik 87/100 nie oznaczał
pełnego audytu nowych formularzy. Aktualny wynik i zakres opisuje
[raport etapu 6](phase-6-step-6-dependencies.md).
