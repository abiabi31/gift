import { BrowserRouter, Routes, Route } from "react-router-dom";
import Birthday from "../Birthday/Birthday";

function AppRoutes() {
  return (
    <BrowserRouter basename="/gift">
      <Routes>
        <Route path="/" element={<Birthday />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
