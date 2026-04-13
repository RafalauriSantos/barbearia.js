import { BrowserRouter, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import OnboardingPage from "./pages/OnboardingPage";
import AppPage from "./pages/AppPage";
import SettingsPage from "./pages/SettingsPage";
import ServicesPage from "./pages/ServicesPage";
import FinancialPage from "./pages/FinancialPage";
import ExpensesPage from "./pages/ExpensesPage";
import NotFound from "./pages/NotFound";
const App = () => (
	<BrowserRouter>
		<Routes>
			<Route path="/" element={<LandingPage />} />
			<Route path="/onboarding" element={<OnboardingPage />} />
			<Route path="/app" element={<AppPage />} />
			<Route path="/services" element={<ServicesPage />} />
			<Route path="/financial" element={<FinancialPage />} />
			<Route path="/expenses" element={<ExpensesPage />} />
			<Route path="/settings" element={<SettingsPage />} />
			<Route path="*" element={<NotFound />} />
		</Routes>
	</BrowserRouter>
);
export default App;
