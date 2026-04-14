/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import LaptopView from "./components/LaptopView";
import MobileView from "./components/MobileView";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LaptopView />} />
        <Route path="/remote/:sessionId" element={<MobileView />} />
      </Routes>
    </BrowserRouter>
  );
}
