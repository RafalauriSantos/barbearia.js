import { BrowserRouter, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AppPage from "./pages/AppPage";
import SettingsPage from "./pages/SettingsPage";
import ServicesPage from "./pages/ServicesPage";
import InDevelopmentPage from "./pages/InDevelopmentPage";
import NotFound from "./pages/NotFound";
const App = () => (
	<BrowserRouter>
		<Routes>
			<Route path="/" element={<LandingPage />} />
			<Route path="/app" element={<AppPage />} />
			<Route path="/services" element={<ServicesPage />} />
			<Route
				path="/financial"
				element={<InDevelopmentPage title="Financeiro" />}
			/>
			<Route
				path="/expenses"
				element={<InDevelopmentPage title="Despesas" />}
			/>
			<Route path="/settings" element={<SettingsPage />} />
			<Route path="*" element={<NotFound />} />
		</Routes>
	</BrowserRouter>
);
export default App;
