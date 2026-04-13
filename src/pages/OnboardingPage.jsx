import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveProfile } from '@/lib/store';
export default function OnboardingPage() {
    const navigate = useNavigate();
    const [shopName, setShopName] = useState('');
    const [barberName, setBarberName] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!shopName.trim() || !barberName.trim())
            return;
        saveProfile({ shopName: shopName.trim(), barberName: barberName.trim() });
        navigate('/app');
    };
    return (<div className="app-shell flex flex-col items-center justify-center min-h-[100dvh] bg-background px-6 py-8">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="text-center mb-10">
          <h1 className="font-logo text-2xl text-foreground tracking-wider">BEM-VINDO</h1>
          <p className="font-mono-ui text-[10px] text-foreground-faint tracking-widest mt-1">CONFIGURE SUA BARBEARIA</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-mono-ui text-[10px] text-foreground-faint block mb-1.5">NOME DA BARBEARIA</label>
            <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} className="w-full bg-secondary text-foreground font-mono text-sm px-3 py-2.5 rounded outline-none focus:ring-1 focus:ring-ring placeholder:text-foreground-faint/40" placeholder="Ex: Barbearia do João" autoFocus/>
          </div>
          <div>
            <label className="font-mono-ui text-[10px] text-foreground-faint block mb-1.5">SEU NOME</label>
            <input type="text" value={barberName} onChange={e => setBarberName(e.target.value)} className="w-full bg-secondary text-foreground font-mono text-sm px-3 py-2.5 rounded outline-none focus:ring-1 focus:ring-ring placeholder:text-foreground-faint/40" placeholder="Seu nome"/>
          </div>
          <button type="submit" className="w-full bg-foreground text-primary-foreground font-mono-ui text-xs py-3 rounded hover:opacity-90 transition-opacity active:scale-[0.98] mt-2">
            COMEÇAR
          </button>
        </form>
      </div>
    </div>);
}
