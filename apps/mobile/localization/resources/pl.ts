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
    description: "Dodaj pojazd, aby rozpocząć prowadzenie jego pełnej historii w jednym miejscu.",
    makeLabel: "Marka",
    makePlaceholder: "np. Toyota",
    nextAction: "Przejdź dalej",
    title: "Dodaj pierwszy pojazd",
  },
  orientation: {
    phoneDescription: "Widok telefonu jest obecnie przygotowany do pracy w pionie.",
    tabletDescription: "Widok tabletu jest obecnie przygotowany do pracy w poziomie.",
    title: "Obróć urządzenie",
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
