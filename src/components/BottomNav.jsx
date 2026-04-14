import { useLocation, useNavigate } from 'react-router-dom';
const tabs = [
    { path: '/app', label: 'AGENDA' },
    { path: '/services', label: 'SERVICOS' },
    { path: '/financial', label: 'FINANCEIRO' },
    { path: '/expenses', label: 'DESPESAS' },
];
export function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    return (<nav className="sticky bottom-0 z-50 bg-background border-t border-border">
      <div className="flex items-stretch max-w-[800px] mx-auto">
        {tabs.map(tab => {
            const isActive = location.pathname === tab.path;
            return (<button key={tab.path} onClick={() => navigate(tab.path)} className={`flex-1 py-3 border-r last:border-r-0 border-border text-xs ${isActive ? 'bg-secondary text-foreground' : 'text-foreground-faint'}`}>
              <span className="font-mono-ui text-[10px]">{tab.label}</span>
            </button>);
        })}
      </div>
    </nav>);
}
