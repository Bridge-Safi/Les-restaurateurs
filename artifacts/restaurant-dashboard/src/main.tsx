import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getStoredToken } from "@/bridge-auth";
import App from "./App";
import "./index.css";

/* Le client API genere (@workspace/api-client-react) attache automatiquement
   un header Authorization: Bearer <token> a chaque requete des qu'un getter
   est enregistre ici. Sans cet appel, tous les hooks generes (commandes,
   stats du dashboard, order-detail, alarmes) partent sans authentification
   et echouent en silence depuis le retrait de Clerk. */
setAuthTokenGetter(getStoredToken);

createRoot(document.getElementById("root")!).render(<App />);
