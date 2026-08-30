export const pl = {
  common: {
    appName: "Moje Auto",
  },
  database: {
    errorAction: "Spróbuj ponownie",
    errorDescription:
      "Nie udało się przygotować lokalnej bazy danych. Twoje dane nie zostały usunięte.",
    errorTitle: "Nie można uruchomić aplikacji",
    loading: "Przygotowywanie danych",
  },
  firstVehicle: {
    addAction: "Dodaj pojazd",
    description: "Dodaj pojazd, aby rozpocząć prowadzenie jego pełnej historii w jednym miejscu.",
    distanceUnitLabel: "Jednostka odległości",
    genericError:
      "Nie udało się zapisać pojazdu. Spróbuj ponownie bez utraty wprowadzonych danych.",
    initialOdometerHelper:
      "To odczyt z momentu rozpoczęcia ewidencji. Późniejsze odczyty możesz dodawać do każdego wpisu.",
    initialOdometerLabel: "Stan licznika na moment rozpoczęcia ewidencji",
    makeLabel: "Marka",
    makePlaceholder: "np. Toyota",
    manufactureYearLabel: "Rok produkcji",
    modelLabel: "Model",
    modelPlaceholder: "np. Corolla",
    photoAction: "Dodaj zdjęcie",
    photoChangeAction: "Zmień",
    photoDenied: "Zezwól na dostęp do galerii w ustawieniach systemu, aby wybrać zdjęcie pojazdu.",
    photoError:
      "Nie udało się przygotować wybranego zdjęcia. Wybierz inne albo kontynuuj bez niego.",
    photoLabel: "Zdjęcie pojazdu",
    photoRemoveAction: "Usuń",
    registrationNumberLabel: "Numer rejestracyjny",
    requiredError: "To pole jest wymagane.",
    invalidNumberError: "Wpisz poprawną nieujemną liczbę całkowitą.",
    title: "Dodaj pierwszy pojazd",
    variantLabel: "Wersja",
    vinError: "Wpisz poprawny, 17-znakowy numer VIN.",
    vinLabel: "VIN",
    yearError: "Wpisz poprawny rok produkcji.",
  },
  orientation: {
    phoneDescription: "Widok telefonu jest obecnie przygotowany do pracy w pionie.",
    tabletDescription: "Widok tabletu jest obecnie przygotowany do pracy w poziomie.",
    title: "Obróć urządzenie",
  },
  route: {
    errorDescription: "Nie udało się odczytać zapisanego pojazdu. Twoje dane nie zostały usunięte.",
    errorTitle: "Nie można otworzyć pojazdu",
    loading: "Otwieranie pojazdu",
  },
  storage: {
    errorDescription:
      "Nie udało się bezpiecznie przygotować lokalnych plików. Twoje dane nie zostały usunięte.",
    errorTitle: "Pliki są niedostępne",
    loading: "Przygotowywanie lokalnych plików",
  },
  workspace: {
    historyDescription: "W tym miejscu pojawi się chronologiczna historia pojazdu.",
    makeAndModel: "Marka + Model",
    mileage: "Przebieg",
    noEntries: "Brak wpisów",
    photo: "Zdjęcie pojazdu",
    variant: "Wersja pojazdu",
  },
} as const;
