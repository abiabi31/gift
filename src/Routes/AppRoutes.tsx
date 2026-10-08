import { Routes, Route } from "react-router-dom";
import Birthday from "../Birthday/Birthday";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Birthday />} />
    </Routes>
  );
}

export default AppRoutes;
