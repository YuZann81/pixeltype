/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { GameProvider } from "./context/GameContext.jsx";
import Home from "./pages/Home.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import Login from "./pages/Login.jsx";
import SelectLanguage from "./pages/SelectLanguage.jsx";
import Guide from "./pages/Guide.jsx";
import Gameplay from "./pages/Gameplay.jsx";
import Overview from "./pages/Overview.jsx";

export default function App() {
  return (
    <GameProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/select-language" element={<SelectLanguage />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/gameplay" element={<Gameplay />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </GameProvider>
  );
}
