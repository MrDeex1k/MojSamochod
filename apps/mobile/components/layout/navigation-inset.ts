import { createContext, useContext } from "react";

// Only scrollable phone screens under the floating navigation receive this inset.
export const NavigationInsetContext = createContext(0);
export const useNavigationInset = () => useContext(NavigationInsetContext);
