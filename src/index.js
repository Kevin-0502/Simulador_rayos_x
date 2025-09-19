import React from "react";
import { createRoot } from "react-dom/client"; // cambia la importación
import App from "./App";

const container = document.getElementById("root");
const root = createRoot(container); // crea raíz react
root.render(<App />); // usa render desde la raíz