import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface SidebarItem {
  icon: React.ComponentType<any>;
  label: string;
  active: boolean;
  onClick: () => void;
}

interface SidebarProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  iconBg: string;
  items: SidebarItem[];
  extraContent?: React.ReactNode;
}

export function Sidebar({ title, subtitle, icon: Icon, iconBg, items, extraContent }: SidebarProps) {
  const { logoutMutation } = useAuth();

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-slate-800">
      <div className="flex items-center px-6 py-4 border-b border-slate-700">
        <div className={`${iconBg} w-10 h-10 rounded-lg flex items-center justify-center`}>
          <Icon className="text-white" />
        </div>
        <div className="ml-3">
          <p className="text-white font-semibold">{title}</p>
          <p className="text-slate-400 text-sm">{subtitle}</p>
        </div>
      </div>
      
      {extraContent}
      
      <nav className="mt-6">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`w-full flex items-center px-6 py-3 transition-colors ${
              item.active 
                ? "text-white bg-slate-700" 
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="ml-3">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="absolute bottom-0 w-64 p-6">
        <Button
          variant="ghost"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-700"
        >
          <LogOut className="w-5 h-5 mr-3" />
          {logoutMutation.isPending ? "Saindo..." : "Sair"}
        </Button>
      </div>
    </div>
  );
}
