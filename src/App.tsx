import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function AppRoutes() {
  return (
    <BrowserRouter basename="/anish">
      <Routes>{/* your routes */}</Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
