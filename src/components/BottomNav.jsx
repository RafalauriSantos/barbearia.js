import { useLocation, useNavigate } from 'react-router-dom';
const tabs = [
    { path: '/app', label: 'AGENDA', icon: '📋' },
    { path: '/services', label: 'SERVIÇOS', icon: '✂' },
    { path: '/financial', label: 'FINANCEIRO', icon: '💰' },
    { path: '/expenses', label: 'DESPESAS', icon: '📉' },
];
export function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    return (<nav className="sticky bottom-0 z-50 bg-background border-t border-border">
      <div className="flex items-stretch max-w-[800px] mx-auto">
        {tabs.map(tab => {
            const isActive = location.pathname === tab.path;
            return (<button key={tab.path} onClick={() => navigate(tab.path)} className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 sm:py-3 transition-colors active:scale-95 ${isActive ? 'text-paid' : 'text-foreground-faint hover:text-foreground'}`}>
              <span className="text-base sm:text-lg leading-none">{tab.icon}</span>
              <span className="font-mono-ui text-[8px] sm:text-[9px] tracking-wider">{tab.label}</span>
            </button>);
        })}
      </div>
    </nav>);
}
